/**
 * Append-only events outbox. Rows are never updated or deleted.
 * A pack = the chain of rows sharing (record_id, stage, version); the row
 * with the highest seq gives the pack status.
 */
import type { Db } from "@/lib/db";
import { Event, type Domain } from "@/lib/contracts/events";
import type { AmendmentMeta, StoredEvent } from "@/lib/contracts/extensions";

export type EventRow = {
  seq: number;
  id: string;
  domain: string;
  stage: string;
  status: string;
  record_id: string;
  related_record_id: string | null;
  public_record_id: string | null;
  receipt_id: string | null;
  actor_role: string;
  actor_user_id: string | null;
  at: string;
  summary: string;
  artifact_refs_json: string;
  confidentiality: string;
  version: number;
  b_sbi: string | null;
  match_id: string | null;
  screening_outcome: string | null;
  idempotency_key: string | null;
  change_note: string | null;
  material_change: number;
};

export function rowToEvent(row: EventRow): StoredEvent {
  const base = {
    id: row.id,
    domain: row.domain,
    stage: row.stage,
    status: row.status,
    recordId: row.record_id,
    relatedRecordId: row.related_record_id ?? undefined,
    publicRecordId: row.public_record_id ?? undefined,
    receiptId: row.receipt_id ?? undefined,
    actorRole: row.actor_role,
    actorUserId: row.actor_user_id ?? undefined,
    at: row.at,
    summary: row.summary,
    artifactRefs: JSON.parse(row.artifact_refs_json),
    confidentiality: row.confidentiality,
    version: row.version,
    bSbi: row.b_sbi ?? undefined,
    matchId: row.match_id ?? undefined,
    screeningOutcome: row.screening_outcome ?? undefined,
  };
  const parsed = Event.parse(base);
  return {
    ...parsed,
    seq: row.seq,
    idempotencyKey: row.idempotency_key ?? undefined,
    changeNote: row.change_note ?? undefined,
    materialChange: row.material_change === 1,
  };
}

/** Validate against the contract, then insert. Returns the stored row. */
export function insertEvent(db: Db, event: Event, idempotencyKey?: string, meta: AmendmentMeta = {}): StoredEvent {
  const ev = Event.parse(event);
  const anyEv = ev as Event & { bSbi?: string; matchId?: string; screeningOutcome?: string };
  db.prepare(
    `INSERT INTO events (id, domain, stage, status, record_id, related_record_id, public_record_id, receipt_id,
       actor_role, actor_user_id, at, summary, artifact_refs_json, confidentiality, version, b_sbi, match_id,
       screening_outcome, idempotency_key, change_note, material_change)
     VALUES (@id, @domain, @stage, @status, @recordId, @relatedRecordId, @publicRecordId, @receiptId,
       @actorRole, @actorUserId, @at, @summary, @artifactRefs, @confidentiality, @version, @bSbi, @matchId,
       @screeningOutcome, @idempotencyKey, @changeNote, @materialChange)`,
  ).run({
    id: ev.id,
    domain: ev.domain,
    stage: ev.stage,
    status: ev.status,
    recordId: ev.recordId,
    relatedRecordId: ev.relatedRecordId ?? null,
    publicRecordId: ev.publicRecordId ?? null,
    receiptId: ev.receiptId ?? null,
    actorRole: ev.actorRole,
    actorUserId: ev.actorUserId ?? null,
    at: ev.at,
    summary: ev.summary,
    artifactRefs: JSON.stringify(ev.artifactRefs ?? []),
    confidentiality: ev.confidentiality,
    version: ev.version,
    bSbi: anyEv.bSbi ?? null,
    matchId: anyEv.matchId ?? null,
    screeningOutcome: anyEv.screeningOutcome ?? null,
    idempotencyKey: idempotencyKey ?? null,
    changeNote: meta.changeNote?.trim() || null,
    materialChange: meta.materialChange ? 1 : 0,
  });
  return getEvent(db, ev.id)!;
}

/** Every version of one (record, stage): latest row per version, ascending. Unfiltered — callers apply policy. */
export function versionsOfPack(db: Db, recordId: string, stage: string): StoredEvent[] {
  const rows = db
    .prepare(
      `SELECT e.* FROM events e
       WHERE e.record_id = ? AND e.stage = ?
         AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)
       ORDER BY e.version ASC`,
    )
    .all(recordId, stage) as EventRow[];
  return rows.map(rowToEvent);
}

export function getEvent(db: Db, id: string): StoredEvent | undefined {
  const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

export function findEventByKey(db: Db, key: string): StoredEvent | undefined {
  const row = db.prepare("SELECT * FROM events WHERE idempotency_key = ?").get(key) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

/** Latest row of the highest version for (record, stage). */
export function latestPackRow(db: Db, recordId: string, stage: string): StoredEvent | undefined {
  const row = db
    .prepare("SELECT * FROM events WHERE record_id = ? AND stage = ? ORDER BY version DESC, seq DESC LIMIT 1")
    .get(recordId, stage) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

/** Latest row for a specific pack (record, stage, version). */
export function packRow(db: Db, recordId: string, stage: string, version: number): StoredEvent | undefined {
  const row = db
    .prepare("SELECT * FROM events WHERE record_id = ? AND stage = ? AND version = ? ORDER BY seq DESC LIMIT 1")
    .get(recordId, stage, version) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

/** Every pack of a record: latest row per (stage, version), unfiltered. Callers apply policy. */
export function packsOfRecord(db: Db, recordId: string): StoredEvent[] {
  const rows = db
    .prepare(
      `SELECT e.* FROM events e
       WHERE e.record_id = ?
         AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)
       ORDER BY e.seq ASC`,
    )
    .all(recordId) as EventRow[];
  return rows.map(rowToEvent);
}

export function eventsOfRecord(db: Db, recordId: string): StoredEvent[] {
  const rows = db.prepare("SELECT * FROM events WHERE record_id = ? ORDER BY seq ASC").all(recordId) as EventRow[];
  return rows.map(rowToEvent);
}

export function latestEventOfRecord(db: Db, recordId: string): StoredEvent | undefined {
  const row = db.prepare("SELECT * FROM events WHERE record_id = ? ORDER BY seq DESC LIMIT 1").get(recordId) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

export function firstPublicRecordId(db: Db, recordId: string): string | undefined {
  const row = db
    .prepare("SELECT public_record_id FROM events WHERE record_id = ? AND public_record_id IS NOT NULL ORDER BY seq ASC LIMIT 1")
    .get(recordId) as { public_record_id: string } | undefined;
  return row?.public_record_id;
}

export function domainOfRecord(db: Db, recordId: string): Domain | undefined {
  const row = db.prepare("SELECT domain FROM events WHERE record_id = ? LIMIT 1").get(recordId) as { domain: Domain } | undefined;
  return row?.domain;
}
