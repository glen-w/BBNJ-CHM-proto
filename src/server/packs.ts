/**
 * Pack machine. draft → pending → published, one transition per status per
 * (record, stage, version). Versions are allocated here, never by clients.
 * Every function runs its writes in one transaction; publish dispatches
 * notifications only after that transaction has committed.
 */
import type { Db } from "@/lib/db";
import type { ArtifactRef, ConfidentialityTier, Domain, Event, PublishStatus } from "@/lib/contracts/events";
import type { AmendmentMeta, IdempotencyKey, StoredEvent } from "@/lib/contracts/extensions";
import { DomainError } from "./errors";
import { mintPublicRecordId, mintReceiptId, nowIso, yearOf } from "./ids";
import { dispatch } from "./notify";
import { findEventByKey, insertEvent, latestPackRow, versionsOfPack } from "./outbox";
import { actorRoleOf, requireCan, type Principal, userId } from "./policy";
import { getRecordMeta, recordTable, refreshCaches } from "./records";

export interface OpenPackArgs {
  domain: Domain;
  recordId: string;
  stage: string;
  status: Extract<PublishStatus, "draft" | "pending">;
  summary: string;
  idempotencyKey: string;
  confidentiality?: ConfidentialityTier;
  artifactRefs?: ArtifactRef[];
  /** Domain-specific extras (bSbi, screeningOutcome, matchId, relatedRecordId). */
  extras?: Record<string, unknown>;
  /** Skip the owner check (caller already authorised, e.g. Secretariat import). */
  actorOverride?: Principal;
  /** Explicit timestamp (seeds); defaults to now. */
  at?: string;
  /** Amendment metadata (versions > 1 only). */
  amendment?: AmendmentMeta;
}

export interface PackResult {
  event: StoredEvent;
  created: boolean;
}

function buildEvent(args: {
  domain: Domain;
  recordId: string;
  stage: string;
  status: PublishStatus;
  version: number;
  actor: Principal;
  summary: string;
  at: string;
  confidentiality: ConfidentialityTier;
  publicRecordId?: string;
  receiptId?: string;
  artifactRefs?: ArtifactRef[];
  extras?: Record<string, unknown>;
}): Event {
  return {
    id: crypto.randomUUID(),
    domain: args.domain,
    stage: args.stage,
    status: args.status,
    recordId: args.recordId,
    version: args.version,
    actorRole: actorRoleOf(args.actor),
    actorUserId: userId(args.actor),
    at: args.at,
    summary: args.summary,
    confidentiality: args.confidentiality,
    publicRecordId: args.publicRecordId,
    receiptId: args.receiptId,
    artifactRefs: args.artifactRefs ?? [],
    ...(args.extras ?? {}),
  } as Event;
}

/**
 * Open a pack row as draft or pending. Version rules (server-side only):
 *   none → 1 · latest draft + pending → same version · latest published → +1
 *   latest draft + draft → invalid · latest pending → already_submitted
 */
export function openPack(db: Db, actor: Principal, args: OpenPackArgs): PackResult {
  const existing = findEventByKey(db, args.idempotencyKey);
  if (existing) return { event: existing, created: false };

  const meta = getRecordMeta(db, args.domain, args.recordId);
  if (!meta) throw new DomainError("not_found", "Record not found");
  // Subject carries domain + record kind so the non-State uploader rule (CBTMT offers only) sees the same facts as the caller.
  const recordKind = args.domain === "cbtmt" ? (args.stage === "offer_posted" ? "offer" : args.stage === "need_posted" ? "need" : undefined) : undefined;
  requireCan(args.actorOverride ?? actor, "submit", { ownerUserId: meta.ownerUserId ?? null, domain: args.domain, recordKind }, { domain: args.domain, recordId: args.recordId, db });

  const tx = db.transaction((): StoredEvent => {
    const latest = latestPackRow(db, args.recordId, args.stage);
    let version = 1;
    if (latest) {
      if (latest.status === "published") version = latest.version + 1;
      else if (latest.status === "pending") throw new DomainError("already_submitted", `A ${args.stage} pack (v${latest.version}) is already pending`);
      else if (latest.status === "draft") {
        if (args.status === "draft") throw new DomainError("invalid_transition", `A ${args.stage} draft (v${latest.version}) already exists — edit it instead`);
        version = latest.version;
      }
    }
    const at = args.at ?? nowIso();
    const receiptId = args.status === "pending" ? mintReceiptId(db, yearOf(at)) : undefined;
    const ev = buildEvent({
      domain: args.domain,
      recordId: args.recordId,
      stage: args.stage,
      status: args.status,
      version,
      actor,
      summary: args.summary,
      at,
      confidentiality: args.confidentiality ?? meta.confidentiality,
      receiptId,
      publicRecordId: meta.publicRecordId,
      artifactRefs: args.artifactRefs,
      extras: args.extras,
    });
    const stored = insertEvent(db, ev, args.idempotencyKey, version > 1 ? args.amendment : undefined);
    refreshCaches(db, args.domain, args.recordId);
    return stored;
  });
  return { event: tx(), created: true };
}

export interface AmendArgs {
  domain: Domain;
  recordId: string;
  stage: string;
  summary: string;
  changeNote: string;
  materialChange: boolean;
  idempotencyKey: IdempotencyKey;
  /** Domain-specific extras carried onto the new version (bSbi, screeningOutcome). */
  extras?: Record<string, unknown>;
  at?: string;
}

/**
 * Amend a published pack: opens pending v+1 of the same (record, stage) carrying
 * a change note and the material-change flag. Only the latest published version
 * can be amended; a pending or draft latest version is refused. Never mints.
 */
export function amendPack(db: Db, actor: Principal, args: AmendArgs): PackResult {
  const existing = findEventByKey(db, args.idempotencyKey);
  if (existing) return { event: existing, created: false };
  const meta = getRecordMeta(db, args.domain, args.recordId);
  if (!meta) throw new DomainError("not_found", "Record not found");
  requireCan(actor, "amend", { ownerUserId: meta.ownerUserId ?? null }, { domain: args.domain, recordId: args.recordId, db });
  const latest = latestPackRow(db, args.recordId, args.stage);
  if (!latest) throw new DomainError("not_found", `No ${args.stage} pack on this record`);
  if (latest.status !== "published") {
    throw new DomainError("invalid_transition", `Only a published pack can be amended — ${args.stage} v${latest.version} is ${latest.status}`);
  }
  const note = args.changeNote.trim();
  if (!note) throw new DomainError("validation", "A change note is required when amending a published pack");
  const carried = latest as StoredEvent & { bSbi?: string; screeningOutcome?: string };
  return openPack(db, actor, {
    domain: args.domain,
    recordId: args.recordId,
    stage: args.stage,
    status: "pending",
    summary: args.summary.trim() || `${args.stage.replace(/_/g, " ")} amended (v${latest.version + 1}): ${note}`,
    idempotencyKey: args.idempotencyKey,
    confidentiality: latest.confidentiality,
    artifactRefs: latest.artifactRefs,
    extras: { ...(carried.bSbi ? { bSbi: carried.bSbi } : {}), ...(carried.screeningOutcome ? { screeningOutcome: carried.screeningOutcome } : {}), ...(args.extras ?? {}) },
    at: args.at,
    amendment: { changeNote: note, materialChange: args.materialChange },
  });
}

/** Version history of one (record, stage), oldest first. Unfiltered — callers apply the read policy. */
export function packVersions(db: Db, recordId: string, stage: string): StoredEvent[] {
  return versionsOfPack(db, recordId, stage);
}

export interface PublishArgs {
  domain: Domain;
  recordId: string;
  stage: string;
  /** Optimistic check: refuse if a newer version exists. */
  expectedVersion?: number;
  at?: string;
}

/**
 * Publish the latest pending version of (record, stage). Idempotent: an
 * already-published latest version returns created=false with no writes.
 * Mints publicRecordId on the record's first publish. Dispatches after commit.
 */
export function publishPack(db: Db, actor: Principal, args: PublishArgs): PackResult {
  requireCan(actor, "publish", undefined, { domain: args.domain, recordId: args.recordId, db });
  const meta = getRecordMeta(db, args.domain, args.recordId);
  if (!meta) throw new DomainError("not_found", "Record not found");

  const latest = latestPackRow(db, args.recordId, args.stage);
  if (!latest) throw new DomainError("not_found", `No ${args.stage} pack on this record`);
  if (args.expectedVersion !== undefined && args.expectedVersion !== latest.version) {
    throw new DomainError("stale_pack", `Version ${args.expectedVersion} is not the latest (${latest.version})`);
  }
  if (latest.status === "published") return { event: latest, created: false };
  if (latest.status !== "pending") throw new DomainError("not_pending", `Latest ${args.stage} pack is ${latest.status}, not pending`);

  const tx = db.transaction((): StoredEvent => {
    const at = args.at ?? nowIso();
    let publicRecordId = meta.publicRecordId;
    if (!publicRecordId) {
      publicRecordId = mintPublicRecordId(db, args.domain, yearOf(at));
      const res = db.prepare(`UPDATE ${recordTable(args.domain)} SET public_record_id = ? WHERE id = ? AND public_record_id IS NULL`).run(publicRecordId, args.recordId);
      if (res.changes !== 1) throw new DomainError("invalid_transition", "publicRecordId already minted concurrently");
    }
    const { seq: _seq, idempotencyKey: _k, id: _id, changeNote, materialChange, ...rest } = latest;
    void _seq;
    void _k;
    void _id;
    const ev = {
      ...rest,
      id: crypto.randomUUID(),
      status: "published",
      at,
      actorRole: actorRoleOf(actor),
      actorUserId: userId(actor),
      publicRecordId,
      summary: latest.summary,
    } as Event;
    const stored = insertEvent(db, ev, undefined, { changeNote, materialChange });
    refreshCaches(db, args.domain, args.recordId);
    return stored;
  });
  const event = tx();
  dispatch(db, event.id); // the NEW published event id, after commit
  return { event, created: true };
}
