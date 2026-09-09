/**
 * EIA journey — pack-level publish spine. Lock 2: STB reviews published
 * draft_eia packs; one consolidated comments_stb row per draft version.
 */
import type { Db } from "@/lib/db";
import { AbnjBox, EiaPublishableStages, type ArtifactRef, type EiaStage, type PublishStatus } from "@/lib/contracts/events";
import { StoredEiaActivity, type IdempotencyKey, type StoredEvent } from "@/lib/contracts/extensions";
import { DomainError } from "./errors";
import { nowIso } from "./ids";
import { dispatch } from "./notify";
import { type EventRow, findEventByKey, insertEvent, latestPackRow, rowToEvent } from "./outbox";
import { RECORD_JOIN, actorRoleOf, hasRole, isSecretariat, readPolicy, requireCan, type Principal, userId, visibilityClause } from "./policy";
import { openPack, type PackResult } from "./packs";
import { refreshCaches } from "./records";

type ActivityRow = {
  id: string;
  public_record_id: string | null;
  current_stage: EiaStage;
  latest_pack_status: PublishStatus | null;
  title: string;
  party_code: string;
  abnj_box: string;
  source_channel: "form" | "excel" | "assisted";
  confidentiality: "public" | "restricted" | "confidential";
  version: number;
  owner_user_id: string | null;
  due_at: string | null;
  updated_at: string;
};

export function rowToActivity(row: ActivityRow): StoredEiaActivity {
  return StoredEiaActivity.parse({
    domain: "eia",
    id: row.id,
    publicRecordId: row.public_record_id ?? undefined,
    currentStage: row.current_stage,
    latestPackStatus: row.latest_pack_status ?? undefined,
    title: row.title,
    partyCode: row.party_code,
    abnjBox: row.abnj_box,
    sourceChannel: row.source_channel,
    confidentiality: row.confidentiality,
    version: row.version,
    ownerUserId: row.owner_user_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    updatedAt: row.updated_at,
  });
}

export function getEiaActivity(db: Db, id: string): StoredEiaActivity | undefined {
  const row = db.prepare("SELECT * FROM eia_activities WHERE id = ?").get(id) as ActivityRow | undefined;
  return row ? rowToActivity(row) : undefined;
}

export interface EiaResult extends PackResult {
  activity: StoredEiaActivity;
}

export const EIA_STAGE_ORDER: EiaStage[] = [
  "screening",
  "planned_activity_notice",
  "scoping_notice",
  "draft_eia",
  "comments_stb",
  "decision_conditions",
  "monitoring_review",
];

export function isPublishableStage(stage: string): stage is (typeof EiaPublishableStages)[number] {
  return (EiaPublishableStages as readonly string[]).includes(stage);
}

/** Create an activity with a draft screening pack (one transaction, one key). */
export function createEiaActivity(
  db: Db,
  actor: Principal,
  input: {
    title: string;
    abnjBox: string;
    partyCode?: string;
    confidentiality?: "public" | "restricted" | "confidential";
    sourceChannel?: "form" | "excel" | "assisted";
    dueAt?: string;
  },
  key: IdempotencyKey,
): EiaResult {
  requireCan(actor, "submit", undefined, { domain: "eia", db });
  const existing = findEventByKey(db, key);
  if (existing) return { activity: getEiaActivity(db, existing.recordId)!, event: existing, created: false };
  const title = input.title.trim();
  if (!title) throw new DomainError("validation", "Title is required");
  const box = AbnjBox.safeParse(input.abnjBox);
  if (!box.success) throw new DomainError("validation", "Choose an ABNJ box from the vocabulary");
  const partyCode = hasRole(actor, "party") && actor.kind === "user" && actor.user.partyCode ? actor.user.partyCode : input.partyCode?.toUpperCase();
  if (!partyCode || !/^[A-Z]{2,3}$/.test(partyCode)) throw new DomainError("validation", "A Party code (2–3 letters) is required");
  const channel = input.sourceChannel ?? (isSecretariat(actor) ? "assisted" : "form");
  const tx = db.transaction((): EiaResult => {
    const id = crypto.randomUUID();
    const at = nowIso();
    db.prepare(
      `INSERT INTO eia_activities (id, current_stage, latest_pack_status, title, party_code, abnj_box, source_channel, confidentiality, version, owner_user_id, due_at, updated_at)
       VALUES (?, 'screening', NULL, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    ).run(id, title, partyCode, box.data, channel, input.confidentiality ?? "public", userId(actor) ?? null, input.dueAt ?? null, at);
    const res = openPack(db, actor, {
      domain: "eia",
      recordId: id,
      stage: "screening",
      status: "draft",
      summary: "Screening opened (Art 31)",
      idempotencyKey: key,
      at,
    });
    return { activity: getEiaActivity(db, id)!, event: res.event, created: true };
  });
  return tx();
}

/** Set or clear the explicit comment-window due date (P1). */
export function setEiaDueAt(db: Db, actor: Principal, activityId: string, dueAt: string | null): StoredEiaActivity {
  const activity = getEiaActivity(db, activityId);
  if (!activity) throw new DomainError("not_found", "Activity not found");
  requireCan(actor, "submit", { ownerUserId: activity.ownerUserId ?? null }, { domain: "eia", recordId: activityId, db });
  if (dueAt) {
    const d = new Date(dueAt);
    if (Number.isNaN(d.getTime())) throw new DomainError("validation", "dueAt must be an ISO datetime");
  }
  db.prepare("UPDATE eia_activities SET due_at = ?, updated_at = ? WHERE id = ?").run(dueAt, nowIso(), activityId);
  return getEiaActivity(db, activityId)!;
}

/** Add a publishable pack. Screening requires an outcome up front so publish cannot fail later. */
export function addEiaPack(
  db: Db,
  actor: Principal,
  activityId: string,
  stage: string,
  summary: string,
  key: IdempotencyKey,
  opts: {
    screeningOutcome?: "eia_required" | "no_eia";
    status?: "draft" | "pending";
    at?: string;
    artifactRefs?: ArtifactRef[];
  } = {},
): EiaResult {
  const activity = getEiaActivity(db, activityId);
  if (!activity) throw new DomainError("not_found", "Activity not found");
  if (!isPublishableStage(stage)) throw new DomainError("validation", `${stage} is not a publishable pack in this build`);
  if (stage === "screening" && !opts.screeningOutcome) throw new DomainError("validation", "Screening outcome is required (Art 31): eia_required or no_eia");
  const res = openPack(db, actor, {
    domain: "eia",
    recordId: activityId,
    stage,
    status: opts.status ?? "pending",
    summary: summary.trim() || `${stage.replace(/_/g, " ")} pack`,
    idempotencyKey: key,
    artifactRefs: opts.artifactRefs,
    extras: stage === "screening" ? { screeningOutcome: opts.screeningOutcome } : undefined,
    at: opts.at,
  });
  return { ...res, activity: getEiaActivity(db, activityId)! };
}

export interface StbQueueItem {
  activityId: string;
  title: string;
  publicRecordId?: string;
  abnjBox: string;
  version: number;
  publishedAt: string;
  eventId: string;
}

/** Published draft_eia packs lacking a comments_stb row for the same (record, version). */
export function stbQueue(db: Db, actor: Principal): StbQueueItem[] {
  const clause = visibilityClause(readPolicy(actor), { status: "e.status", tier: "e.confidentiality", owner: "r.owner_user_id" });
  const rows = db
    .prepare(
      `SELECT e.record_id, e.version, e.at, e.id AS event_id, a.title, a.public_record_id, a.abnj_box
       FROM events e ${RECORD_JOIN}
       JOIN eia_activities a ON a.id = e.record_id
       WHERE e.domain = 'eia' AND e.stage = 'draft_eia' AND e.status = 'published'
         AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)
         AND NOT EXISTS (SELECT 1 FROM events c WHERE c.record_id = e.record_id AND c.stage = 'comments_stb' AND c.version = e.version)
         AND ${clause.sql}
       ORDER BY e.at ASC`,
    )
    .all(...clause.params) as { record_id: string; version: number; at: string; event_id: string; title: string; public_record_id: string | null; abnj_box: string }[];
  return rows.map((r) => ({
    activityId: r.record_id,
    title: r.title,
    publicRecordId: r.public_record_id ?? undefined,
    abnjBox: r.abnj_box,
    version: r.version,
    publishedAt: r.at,
    eventId: r.event_id,
  }));
}

/** One consolidated STB comment per published draft version. Published row; dispatches after commit. */
export function commentStb(db: Db, actor: Principal, activityId: string, text: string, key: IdempotencyKey): EiaResult {
  requireCan(actor, "comment_stb", undefined, { domain: "eia", recordId: activityId, db });
  const existing = findEventByKey(db, key);
  if (existing) return { activity: getEiaActivity(db, existing.recordId)!, event: existing, created: false };
  const activity = getEiaActivity(db, activityId);
  if (!activity) throw new DomainError("not_found", "Activity not found");
  const draft = latestPackRow(db, activityId, "draft_eia");
  if (!draft || draft.status !== "published") throw new DomainError("not_found", "No published draft EIA to comment on");
  const already = db
    .prepare("SELECT 1 FROM events WHERE record_id = ? AND stage = 'comments_stb' AND version = ?")
    .get(activityId, draft.version);
  if (already) throw new DomainError("already_commented", `STB has already commented on draft EIA v${draft.version}`);
  const body = text.trim();
  if (!body) throw new DomainError("validation", "Comment text is required");
  const tx = db.transaction((): StoredEvent => {
    const stored = insertEvent(
      db,
      {
        id: crypto.randomUUID(),
        domain: "eia",
        stage: "comments_stb",
        status: "published",
        recordId: activityId,
        version: draft.version,
        actorRole: actorRoleOf(actor),
        actorUserId: userId(actor),
        at: nowIso(),
        summary: `STB comments on draft EIA v${draft.version}: ${body.slice(0, 200)}`,
        artifactRefs: [],
        confidentiality: draft.confidentiality,
        publicRecordId: activity.publicRecordId,
      },
      key,
    );
    refreshCaches(db, "eia", activityId);
    return stored;
  });
  const event = tx();
  dispatch(db, event.id);
  return { activity: getEiaActivity(db, activityId)!, event, created: true };
}

/** Packs of an activity (latest row per stage/version), filtered by the read policy. */
export function packsForActivity(db: Db, actor: Principal, activityId: string): StoredEvent[] {
  const clause = visibilityClause(readPolicy(actor), { status: "e.status", tier: "e.confidentiality", owner: "r.owner_user_id" });
  const rows = db
    .prepare(
      `SELECT e.* FROM events e ${RECORD_JOIN}
       WHERE e.record_id = ?
         AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)
         AND ${clause.sql}
       ORDER BY e.seq ASC`,
    )
    .all(activityId, ...clause.params) as EventRow[];
  return rows.map(rowToEvent);
}
