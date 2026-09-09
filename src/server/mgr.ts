/**
 * MGR journey — Lock 3: bSbi is minted once, on valid pre-collection receipt
 * (pack enters pending), never on publish. Draft → submit operates on the
 * same batch; submitting twice never mints twice.
 */
import type { Db } from "@/lib/db";
import type { ArtifactRef, MgrStage, SourceChannel } from "@/lib/contracts/events";
import { StoredMgrBatch, type IdempotencyKey } from "@/lib/contracts/extensions";
import { MgrPreCollectionInput, coerceMgrInput, splitMgrInput, FIELD_DEFS } from "@/lib/mgr-fields";
import { DomainError } from "./errors";
import { mintBSbi, nowIso, yearOf } from "./ids";
import { findEventByKey, latestPackRow } from "./outbox";
import { amendPack, openPack, type PackResult } from "./packs";
import { hasRole, isSecretariat, requireCan, type Principal, userId } from "./policy";

type BatchRow = {
  id: string;
  public_record_id: string | null;
  b_sbi: string | null;
  current_stage: MgrStage;
  party_code: string;
  title: string;
  location_hint: string | null;
  source_channel: SourceChannel;
  confidentiality: "public" | "restricted" | "confidential";
  version: number;
  tk_fpic_flag: number;
  owner_user_id: string | null;
  details_json: string;
  details_history_json: string;
  tk_provenance_note?: string | null;
  fpic_status_note?: string | null;
  updated_at: string;
};

export function rowToBatch(row: BatchRow): StoredMgrBatch {
  return StoredMgrBatch.parse({
    domain: "mgr",
    id: row.id,
    publicRecordId: row.public_record_id ?? undefined,
    bSbi: row.b_sbi ?? undefined,
    currentStage: row.current_stage,
    partyCode: row.party_code,
    title: row.title,
    locationHint: row.location_hint ?? undefined,
    sourceChannel: row.source_channel,
    confidentiality: row.confidentiality,
    version: row.version,
    tkFpicFlag: row.tk_fpic_flag === 1,
    ownerUserId: row.owner_user_id ?? undefined,
    details: JSON.parse(row.details_json),
    detailsHistory: JSON.parse(row.details_history_json ?? "[]"),
    tkProvenanceNote: row.tk_provenance_note ?? undefined,
    fpicStatusNote: row.fpic_status_note ?? undefined,
    updatedAt: row.updated_at,
  });
}

export function getMgrBatch(db: Db, id: string): StoredMgrBatch | undefined {
  const row = db.prepare("SELECT * FROM mgr_batches WHERE id = ?").get(id) as BatchRow | undefined;
  return row ? rowToBatch(row) : undefined;
}

export interface MgrResult extends PackResult {
  batch: StoredMgrBatch;
}

function partyCodeFor(actor: Principal, override?: string): string {
  if (hasRole(actor, "party") && actor.kind === "user" && actor.user.partyCode) return actor.user.partyCode;
  if (override && /^[A-Za-z]{2,3}$/.test(override)) return override.toUpperCase();
  throw new DomainError("validation", "A Party code (2–3 letters) is required when submitting on behalf of a Party");
}

function channelFor(actor: Principal, requested: SourceChannel): SourceChannel {
  if (requested === "excel") return "excel";
  return isSecretariat(actor) ? "assisted" : "form";
}

export function storedValues(batch: StoredMgrBatch): Record<string, unknown> {
  return {
    title: batch.title,
    locationHint: batch.locationHint ?? "",
    tkFpicFlag: batch.tkFpicFlag,
    confidentiality: batch.confidentiality,
    ...batch.details,
  };
}

/** String projection of the Art 12.2 values, as kept in details_history_json. */
function valuesSnapshot(batch: StoredMgrBatch): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(storedValues(batch))) out[k] = typeof v === "boolean" ? (v ? "yes" : "no") : String(v ?? "");
  return out;
}

function validateFull(raw: Record<string, unknown>) {
  const parsed = MgrPreCollectionInput.safeParse(coerceMgrInput(raw));
  if (!parsed.success) {
    throw new DomainError("validation", "Pre-collection notification incomplete", parsed.error.issues);
  }
  return parsed.data;
}

function writeBatchFields(db: Db, id: string, input: Record<string, unknown>) {
  const { columns, details } = splitMgrInput(input as never);
  db.prepare(
    `UPDATE mgr_batches SET title = ?, location_hint = ?, tk_fpic_flag = ?, confidentiality = ?, details_json = ?, updated_at = ? WHERE id = ?`,
  ).run(
    String(columns.title ?? "Untitled draft") || "Untitled draft",
    (columns.locationHint as string) || null,
    columns.tkFpicFlag ? 1 : 0,
    (columns.confidentiality as string) || "public",
    JSON.stringify(details),
    nowIso(),
    id,
  );
}

function insertBatch(db: Db, actor: Principal, partyCode: string, channel: SourceChannel, at: string): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO mgr_batches (id, current_stage, party_code, title, source_channel, confidentiality, version, tk_fpic_flag, owner_user_id, details_json, updated_at)
     VALUES (?, 'pre_collection', ?, 'Untitled draft', ?, 'public', 1, 0, ?, '{}', ?)`,
  ).run(id, partyCode, channel, userId(actor) ?? null, at);
  return id;
}

/** Inner receipt step, runs inside the caller's transaction. Mints B-SBI exactly once. */
function acceptReceipt(
  db: Db,
  actor: Principal,
  batchId: string,
  key: IdempotencyKey,
  at: string,
  opts: { summary?: string; artifactRefs?: ArtifactRef[] } = {},
): PackResult {
  const batch = getMgrBatch(db, batchId)!;
  const bSbi = mintBSbi(db, batch.partyCode, yearOf(at));
  const res = db
    .prepare("UPDATE mgr_batches SET b_sbi = ?, current_stage = 'batch_id_issued', updated_at = ? WHERE id = ? AND b_sbi IS NULL")
    .run(bSbi, at, batchId);
  if (res.changes !== 1) throw new DomainError("already_submitted", "B-SBI already issued for this batch");
  return openPack(db, actor, {
    domain: "mgr",
    recordId: batchId,
    stage: "pre_collection",
    status: "pending",
    summary: opts.summary ?? `Pre-collection notification received; B-SBI ${bSbi} issued (Art 12)`,
    idempotencyKey: key,
    confidentiality: batch.confidentiality,
    artifactRefs: opts.artifactRefs,
    extras: { bSbi },
    at,
  });
}

/**
 * Save (or update) a draft. Never mints. Creating a draft writes one batch
 * plus one draft row; editing an existing draft only updates the batch.
 */
export function saveMgrDraft(
  db: Db,
  actor: Principal,
  raw: Record<string, unknown>,
  key: IdempotencyKey,
  opts: { batchId?: string; partyCode?: string } = {},
): MgrResult {
  requireCan(actor, "submit", undefined, { domain: "mgr", recordId: opts.batchId, db });
  if (opts.batchId) {
    const batch = getMgrBatch(db, opts.batchId);
    if (!batch) throw new DomainError("not_found", "Batch not found");
    requireCan(actor, "submit", { ownerUserId: batch.ownerUserId ?? null }, { domain: "mgr", recordId: batch.id, db });
    if (batch.currentStage !== "pre_collection") throw new DomainError("already_submitted", "This batch has already been received");
    writeBatchFields(db, batch.id, coerceMgrInput({ ...storedValues(batch), ...raw }));
    const event = latestPackRow(db, batch.id, "pre_collection")!;
    return { batch: getMgrBatch(db, batch.id)!, event, created: false };
  }
  const existing = findEventByKey(db, key);
  if (existing) return { batch: getMgrBatch(db, existing.recordId)!, event: existing, created: false };

  const partyCode = partyCodeFor(actor, opts.partyCode);
  const tx = db.transaction((): MgrResult => {
    const at = nowIso();
    const id = insertBatch(db, actor, partyCode, channelFor(actor, "form"), at);
    writeBatchFields(db, id, coerceMgrInput(raw));
    const res = openPack(db, actor, {
      domain: "mgr",
      recordId: id,
      stage: "pre_collection",
      status: "draft",
      summary: "Pre-collection notification saved as draft",
      idempotencyKey: key,
      at,
    });
    return { batch: getMgrBatch(db, id)!, event: res.event, created: true };
  });
  return tx();
}

/** Submit an existing draft: validate merged input, mint B-SBI once, pending row with receipt. */
export function submitPreCollection(db: Db, actor: Principal, batchId: string, rawEdits: Record<string, unknown>, key: IdempotencyKey): MgrResult {
  const existing = findEventByKey(db, key);
  if (existing) return { batch: getMgrBatch(db, existing.recordId)!, event: existing, created: false };
  const batch = getMgrBatch(db, batchId);
  if (!batch) throw new DomainError("not_found", "Batch not found");
  requireCan(actor, "submit", { ownerUserId: batch.ownerUserId ?? null }, { domain: "mgr", recordId: batch.id, db });
  if (batch.bSbi || batch.currentStage !== "pre_collection") throw new DomainError("already_submitted", "This batch has already been received and holds a B-SBI");
  const input = validateFull({ ...storedValues(batch), ...rawEdits });
  const tx = db.transaction((): MgrResult => {
    writeBatchFields(db, batch.id, input);
    const res = acceptReceipt(db, actor, batch.id, key, nowIso());
    return { batch: getMgrBatch(db, batch.id)!, event: res.event, created: true };
  });
  return tx();
}

/** Create + submit in one transaction (form without draft; Excel import). */
export function receivePreCollection(
  db: Db,
  actor: Principal,
  raw: Record<string, unknown>,
  sourceChannel: SourceChannel,
  key: IdempotencyKey,
  opts: { partyCode?: string; at?: string; summary?: string; artifactRefs?: ArtifactRef[] } = {},
): MgrResult {
  requireCan(actor, "submit", undefined, { domain: "mgr", db });
  const existing = findEventByKey(db, key);
  if (existing) return { batch: getMgrBatch(db, existing.recordId)!, event: existing, created: false };
  const partyCode = partyCodeFor(actor, opts.partyCode);
  const input = validateFull(raw);
  const tx = db.transaction((): MgrResult => {
    const at = opts.at ?? nowIso();
    const id = insertBatch(db, actor, partyCode, channelFor(actor, sourceChannel), at);
    writeBatchFields(db, id, input);
    const res = acceptReceipt(db, actor, id, key, at, { summary: opts.summary, artifactRefs: opts.artifactRefs });
    return { batch: getMgrBatch(db, id)!, event: res.event, created: true };
  });
  return tx();
}

/** Later MGR packs (post-collection, utilisation) — pending, version allocated server-side. */
export function addMgrPack(
  db: Db,
  actor: Principal,
  batchId: string,
  stage: Extract<MgrStage, "post_collection" | "utilisation">,
  summary: string,
  key: IdempotencyKey,
  _clientSupplied?: unknown, // ignored on purpose: clients never choose versions
): MgrResult {
  void _clientSupplied;
  const batch = getMgrBatch(db, batchId);
  if (!batch) throw new DomainError("not_found", "Batch not found");
  if (!batch.bSbi) throw new DomainError("invalid_transition", "Pre-collection receipt must be accepted before later packs");
  if (stage !== "post_collection" && stage !== "utilisation") throw new DomainError("validation", "Unsupported MGR stage");
  const res = openPack(db, actor, {
    domain: "mgr",
    recordId: batchId,
    stage,
    status: "pending",
    summary: summary.trim() || `${stage.replace("_", "-")} notification`,
    idempotencyKey: key,
    extras: { bSbi: batch.bSbi },
  });
  return { ...res, batch: getMgrBatch(db, batchId)! };
}

export const MGR_AMENDABLE_STAGES = ["pre_collection", "post_collection", "utilisation"] as const;
export type MgrAmendableStage = (typeof MGR_AMENDABLE_STAGES)[number];

/**
 * Amend a published MGR pack → pending v+1 with change note and material flag.
 * Pre-collection amendments may edit Art 12.2 fields: the merged input is
 * re-validated, the superseded values are appended to details_history_json.
 * Never touches the B-SBI or the publicRecordId.
 */
export function amendMgrPack(
  db: Db,
  actor: Principal,
  batchId: string,
  stage: MgrAmendableStage,
  input: { summary?: string; changeNote: string; materialChange: boolean; fieldEdits?: Record<string, unknown> },
  key: IdempotencyKey,
): MgrResult {
  const existing = findEventByKey(db, key);
  if (existing) return { batch: getMgrBatch(db, existing.recordId)!, event: existing, created: false };
  const batch = getMgrBatch(db, batchId);
  if (!batch) throw new DomainError("not_found", "Batch not found");
  if (!MGR_AMENDABLE_STAGES.includes(stage)) throw new DomainError("validation", "Unsupported MGR stage");
  requireCan(actor, "amend", { ownerUserId: batch.ownerUserId ?? null }, { domain: "mgr", recordId: batch.id, db });
  const latest = latestPackRow(db, batchId, stage);
  if (!latest || latest.status !== "published") {
    throw new DomainError("invalid_transition", `Only a published ${stage.replace("_", "-")} pack can be amended`);
  }
  const tx = db.transaction((): MgrResult => {
    let summary = input.summary?.trim() || "";
    if (stage === "pre_collection" && input.fieldEdits && Object.keys(input.fieldEdits).length > 0) {
      const merged = validateFull({ ...storedValues(batch), ...input.fieldEdits });
      const history = [...batch.detailsHistory, { version: latest.version, at: nowIso(), values: valuesSnapshot(batch) }];
      db.prepare("UPDATE mgr_batches SET details_history_json = ? WHERE id = ?").run(JSON.stringify(history), batch.id);
      writeBatchFields(db, batch.id, merged);
      summary ||= `Pre-collection notification amended (v${latest.version + 1}); B-SBI ${batch.bSbi} unchanged`;
    }
    const res = amendPack(db, actor, {
      domain: "mgr",
      recordId: batchId,
      stage,
      summary,
      changeNote: input.changeNote,
      materialChange: input.materialChange,
      idempotencyKey: key,
      extras: batch.bSbi ? { bSbi: batch.bSbi } : undefined,
    });
    return { ...res, batch: getMgrBatch(db, batchId)! };
  });
  return tx();
}

export const MGR_FIELD_DEFS = FIELD_DEFS;
