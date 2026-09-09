/**
 * Policy-filtered reads for the UI. Every query applies readPolicy through
 * visibilityClause / recordVisibilityClause — no hand-written visibility SQL.
 */
import type { Db } from "@/lib/db";
import type { Domain, Notification, Subscription } from "@/lib/contracts/events";
import type { StoredAbmtProposal, StoredCbtmtRecord, StoredEiaActivity, StoredEvent, StoredMgrBatch } from "@/lib/contracts/extensions";
import { rowToAbmt } from "./abmt";
import { rowToCbtmt } from "./cbtmt";
import { rowToActivity } from "./eia";
import { rowToBatch } from "./mgr";
import { domainPath } from "@/lib/format";
import { getEvent, type EventRow, rowToEvent } from "./outbox";
import { RECORD_JOIN, can, type Principal, readPolicy, recordVisibilityClause, userId, visibilityClause } from "./policy";
import { provenanceBadgeForRecord, type ProvenanceBadge } from "./seed-pack";

const eventClause = (p: Principal) => visibilityClause(readPolicy(p), { status: "e.status", tier: "e.confidentiality", owner: "r.owner_user_id" });

/**
 * Turn raw user input into a safe FTS5 MATCH expression.
 * Strips quotes / FTS operators, then AND-joins prefix tokens (`token*`).
 */
export function toFtsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .replace(/["'^~*():]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}

const DOMAIN_HREF: Record<Domain, (id: string) => string> = {
  mgr: (id) => `/mgr/${id}`,
  eia: (id) => `/eia/${id}`,
  cbtmt: (id) => `/capacity/${id}`,
  abmt: (id) => `/abmt/${id}`,
};

export interface SearchHit {
  domain: Domain;
  id: string;
  title: string;
  subtitle?: string;
  stage: string;
  publicRecordId?: string;
  href: string;
  updatedAt: string;
  /** Seed-pack honesty chip when the hit came from fixtures/bbnj-chm-seed-pack. */
  provenanceBadge?: ProvenanceBadge;
}

export function searchRecords(
  db: Db,
  p: Principal,
  opts: { q: string; domain?: Domain; limit?: number },
): SearchHit[] {
  const match = toFtsQuery(opts.q);
  if (!match) return [];
  const limit = opts.limit ?? 50;
  const domains: Domain[] = opts.domain ? [opts.domain] : ["mgr", "eia", "cbtmt", "abmt"];
  const hits: SearchHit[] = [];

  for (const domain of domains) {
    if (domain === "mgr") {
      const c = recordVisibilityClause(readPolicy(p), { id: "b.id", tier: "b.confidentiality", owner: "b.owner_user_id" });
      const rows = db
        .prepare(
          `SELECT b.id, b.title, b.location_hint AS subtitle, b.current_stage AS stage,
                  b.public_record_id, b.updated_at, bm25(records_fts) AS rank
           FROM records_fts
           JOIN mgr_batches b ON b.id = records_fts.record_id
           WHERE records_fts.domain = 'mgr' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY rank, b.updated_at DESC
           LIMIT ?`,
        )
        .all(match, ...c.params, limit) as {
        id: string;
        title: string;
        subtitle: string | null;
        stage: string;
        public_record_id: string | null;
        updated_at: string;
      }[];
      for (const r of rows) {
        hits.push({
          domain,
          id: r.id,
          title: r.title,
          subtitle: r.subtitle ?? undefined,
          stage: r.stage,
          publicRecordId: r.public_record_id ?? undefined,
          href: DOMAIN_HREF.mgr(r.id),
          updatedAt: r.updated_at,
          provenanceBadge: provenanceBadgeForRecord(db, r.id),
        });
      }
    } else if (domain === "eia") {
      const c = recordVisibilityClause(readPolicy(p), { id: "a.id", tier: "a.confidentiality", owner: "a.owner_user_id" });
      const rows = db
        .prepare(
          `SELECT a.id, a.title, a.abnj_box AS subtitle, a.current_stage AS stage,
                  a.public_record_id, a.updated_at, bm25(records_fts) AS rank
           FROM records_fts
           JOIN eia_activities a ON a.id = records_fts.record_id
           WHERE records_fts.domain = 'eia' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY rank, a.updated_at DESC
           LIMIT ?`,
        )
        .all(match, ...c.params, limit) as {
        id: string;
        title: string;
        subtitle: string | null;
        stage: string;
        public_record_id: string | null;
        updated_at: string;
      }[];
      for (const r of rows) {
        hits.push({
          domain,
          id: r.id,
          title: r.title,
          subtitle: r.subtitle ?? undefined,
          stage: r.stage,
          publicRecordId: r.public_record_id ?? undefined,
          href: DOMAIN_HREF.eia(r.id),
          updatedAt: r.updated_at,
          provenanceBadge: provenanceBadgeForRecord(db, r.id),
        });
      }
    } else if (domain === "cbtmt") {
      const c = recordVisibilityClause(readPolicy(p), { id: "r.id", tier: "r.confidentiality", owner: "r.owner_user_id" });
      const rows = db
        .prepare(
          `SELECT r.id, r.title, r.kind AS subtitle, r.stage,
                  r.public_record_id, r.updated_at, bm25(records_fts) AS rank
           FROM records_fts
           JOIN cbtmt_records r ON r.id = records_fts.record_id
           WHERE records_fts.domain = 'cbtmt' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY rank, r.updated_at DESC
           LIMIT ?`,
        )
        .all(match, ...c.params, limit) as {
        id: string;
        title: string;
        subtitle: string | null;
        stage: string;
        public_record_id: string | null;
        updated_at: string;
      }[];
      for (const r of rows) {
        hits.push({
          domain,
          id: r.id,
          title: r.title,
          subtitle: r.subtitle ?? undefined,
          stage: r.stage,
          publicRecordId: r.public_record_id ?? undefined,
          href: DOMAIN_HREF.cbtmt(r.id),
          updatedAt: r.updated_at,
          provenanceBadge: provenanceBadgeForRecord(db, r.id),
        });
      }
    } else {
      const c = recordVisibilityClause(readPolicy(p), { id: "a.id", tier: "a.confidentiality", owner: "a.owner_user_id" });
      const rows = db
        .prepare(
          `SELECT a.id, a.title, a.party_code AS subtitle, a.current_stage AS stage,
                  a.public_record_id, a.updated_at, bm25(records_fts) AS rank
           FROM records_fts
           JOIN abmt_proposals a ON a.id = records_fts.record_id
           WHERE records_fts.domain = 'abmt' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY rank, a.updated_at DESC
           LIMIT ?`,
        )
        .all(match, ...c.params, limit) as {
        id: string;
        title: string;
        subtitle: string | null;
        stage: string;
        public_record_id: string | null;
        updated_at: string;
      }[];
      for (const r of rows) {
        hits.push({
          domain,
          id: r.id,
          title: r.title,
          subtitle: r.subtitle ?? undefined,
          stage: r.stage,
          publicRecordId: r.public_record_id ?? undefined,
          href: DOMAIN_HREF.abmt(r.id),
          updatedAt: r.updated_at,
          provenanceBadge: provenanceBadgeForRecord(db, r.id),
        });
      }
    }
  }

  hits.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return hits.slice(0, limit);
}

// ------------------------------------------------------------------ records

export function listMgrBatches(db: Db, p: Principal, q?: string): StoredMgrBatch[] {
  const c = recordVisibilityClause(readPolicy(p), { id: "b.id", tier: "b.confidentiality", owner: "b.owner_user_id" });
  const match = q ? toFtsQuery(q) : null;
  const rows = db
    .prepare(
      match
        ? `SELECT b.* FROM records_fts
           JOIN mgr_batches b ON b.id = records_fts.record_id
           WHERE records_fts.domain = 'mgr' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY bm25(records_fts), b.updated_at DESC`
        : `SELECT b.* FROM mgr_batches b WHERE ${c.sql} ORDER BY b.updated_at DESC`,
    )
    .all(...(match ? [match, ...c.params] : c.params)) as Parameters<typeof rowToBatch>[0][];
  return rows.map(rowToBatch);
}

export function listEiaActivities(db: Db, p: Principal, q?: string): StoredEiaActivity[] {
  const c = recordVisibilityClause(readPolicy(p), { id: "a.id", tier: "a.confidentiality", owner: "a.owner_user_id" });
  const match = q ? toFtsQuery(q) : null;
  const rows = db
    .prepare(
      match
        ? `SELECT a.* FROM records_fts
           JOIN eia_activities a ON a.id = records_fts.record_id
           WHERE records_fts.domain = 'eia' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY bm25(records_fts), a.updated_at DESC`
        : `SELECT a.* FROM eia_activities a WHERE ${c.sql} ORDER BY a.updated_at DESC`,
    )
    .all(...(match ? [match, ...c.params] : c.params)) as Parameters<typeof rowToActivity>[0][];
  return rows.map(rowToActivity);
}

export function listCbtmtRecords(db: Db, p: Principal, kind?: "need" | "offer", q?: string): StoredCbtmtRecord[] {
  const c = recordVisibilityClause(readPolicy(p), { id: "r.id", tier: "r.confidentiality", owner: "r.owner_user_id" });
  const match = q ? toFtsQuery(q) : null;
  const kindSql = kind ? "AND r.kind = ?" : "";
  const rows = db
    .prepare(
      match
        ? `SELECT r.* FROM records_fts
           JOIN cbtmt_records r ON r.id = records_fts.record_id
           WHERE records_fts.domain = 'cbtmt' AND records_fts MATCH ? AND ${c.sql} ${kindSql}
           ORDER BY bm25(records_fts), r.updated_at DESC`
        : `SELECT r.* FROM cbtmt_records r WHERE ${c.sql} ${kindSql} ORDER BY r.updated_at DESC`,
    )
    .all(...(match ? [match, ...c.params] : [...c.params]), ...(kind ? [kind] : [])) as Parameters<typeof rowToCbtmt>[0][];
  return rows.map(rowToCbtmt);
}

export function listAbmtProposals(db: Db, p: Principal, q?: string): StoredAbmtProposal[] {
  const c = recordVisibilityClause(readPolicy(p), { id: "a.id", tier: "a.confidentiality", owner: "a.owner_user_id" });
  const match = q ? toFtsQuery(q) : null;
  const rows = db
    .prepare(
      match
        ? `SELECT a.* FROM records_fts
           JOIN abmt_proposals a ON a.id = records_fts.record_id
           WHERE records_fts.domain = 'abmt' AND records_fts MATCH ? AND ${c.sql}
           ORDER BY bm25(records_fts), a.updated_at DESC`
        : `SELECT a.* FROM abmt_proposals a WHERE ${c.sql} ORDER BY a.updated_at DESC`,
    )
    .all(...(match ? [match, ...c.params] : c.params)) as Parameters<typeof rowToAbmt>[0][];
  return rows.map(rowToAbmt);
}

/** Is a single record visible to this principal? */
export function recordVisible(db: Db, p: Principal, domain: Domain, id: string): boolean {
  const table = domain === "mgr" ? "mgr_batches" : domain === "eia" ? "eia_activities" : domain === "cbtmt" ? "cbtmt_records" : "abmt_proposals";
  const c = recordVisibilityClause(readPolicy(p), { id: "x.id", tier: "x.confidentiality", owner: "x.owner_user_id" });
  return !!db.prepare(`SELECT 1 FROM ${table} x WHERE x.id = ? AND ${c.sql}`).get(id, ...c.params);
}

/** Packs of any record, filtered. */
export function packsOf(db: Db, p: Principal, recordId: string): StoredEvent[] {
  const c = eventClause(p);
  const rows = db
    .prepare(
      `SELECT e.* FROM events e ${RECORD_JOIN}
       WHERE e.record_id = ?
         AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)
         AND ${c.sql} ORDER BY e.seq ASC`,
    )
    .all(recordId, ...c.params) as EventRow[];
  return rows.map(rowToEvent);
}

/** Full timeline of a record, filtered. */
export function timelineOf(db: Db, p: Principal, recordId: string): AuditRow[] {
  const c = eventClause(p);
  const rows = db.prepare(`SELECT e.* FROM events e ${RECORD_JOIN} WHERE e.record_id = ? AND ${c.sql} ORDER BY e.seq ASC`).all(recordId, ...c.params) as EventRow[];
  return rows.map((r) => project(p, rowToEvent(r)));
}

// ------------------------------------------------------------------ audit

export interface AuditRow {
  seq: number;
  id: string;
  domain: Domain;
  stage: string;
  status: "draft" | "pending" | "published";
  recordId: string;
  version: number;
  actorRole: string;
  at: string;
  summary: string;
  confidentiality: "public" | "restricted" | "confidential";
  publicRecordId?: string;
  receiptId?: string;
  bSbi?: string;
  /** Secretariat projection only. */
  actorUserId?: string;
  idempotencyKey?: string;
  dispatch?: { at: string; deliveredCount: number; error: string | null } | null;
}

function project(p: Principal, e: StoredEvent, dispatch?: AuditRow["dispatch"]): AuditRow {
  const base: AuditRow = {
    seq: e.seq,
    id: e.id,
    domain: e.domain,
    stage: e.stage,
    status: e.status,
    recordId: e.recordId,
    version: e.version,
    actorRole: e.actorRole,
    at: e.at,
    summary: e.summary,
    confidentiality: e.confidentiality,
    publicRecordId: e.publicRecordId,
    receiptId: e.receiptId,
    bSbi: e.domain === "mgr" ? e.bSbi : undefined,
  };
  if (can(p, "view_full_audit")) {
    base.actorUserId = e.actorUserId;
    base.idempotencyKey = e.idempotencyKey;
    base.dispatch = dispatch ?? null;
  }
  return base;
}

export function auditRows(db: Db, p: Principal, f: { domain?: string; status?: string; limit?: number }): AuditRow[] {
  const c = eventClause(p);
  const where: string[] = [c.sql];
  const params: unknown[] = [...c.params];
  if (f.domain) {
    where.push("e.domain = ?");
    params.push(f.domain);
  }
  if (f.status) {
    where.push("e.status = ?");
    params.push(f.status);
  }
  const full = can(p, "view_full_audit");
  const rows = db
    .prepare(
      `SELECT e.*${full ? ", d.at AS d_at, d.delivered_count AS d_count, d.error AS d_error" : ""}
       FROM events e ${RECORD_JOIN} ${full ? "LEFT JOIN dispatch_log d ON d.event_id = e.id" : ""}
       WHERE ${where.join(" AND ")} ORDER BY e.seq DESC LIMIT ?`,
    )
    .all(...params, f.limit ?? 500) as (EventRow & { d_at?: string | null; d_count?: number | null; d_error?: string | null })[];
  return rows.map((r) =>
    project(
      p,
      rowToEvent(r),
      full && r.d_at ? { at: r.d_at, deliveredCount: r.d_count ?? 0, error: r.d_error ?? null } : null,
    ),
  );
}

/** Latest outbox row visible to this principal — labelled Latest transaction. */
export function latestVisibleEvent(db: Db, p: Principal): AuditRow | null {
  const rows = auditRows(db, p, { limit: 1 });
  return rows[0] ?? null;
}

export interface FeedItem {
  eventId: string;
  domain: Domain;
  stage: string;
  status: "draft" | "pending" | "published";
  confidentiality: "public" | "restricted" | "confidential";
  recordId: string;
  publicRecordId?: string;
  title: string;
  at: string;
  provenanceBadge?: ProvenanceBadge;
}

export function recentPublished(db: Db, p: Principal, limit = 8): FeedItem[] {
  const c = eventClause(p);
  const rows = db
    .prepare(
      `SELECT e.id, e.domain, e.stage, e.status, e.confidentiality, e.record_id, e.public_record_id, e.at,
              COALESCE(mb.title, ea.title, cr.title, ap.title) AS title
       FROM events e ${RECORD_JOIN}
       LEFT JOIN mgr_batches mb ON mb.id = e.record_id
       LEFT JOIN eia_activities ea ON ea.id = e.record_id
       LEFT JOIN cbtmt_records cr ON cr.id = e.record_id
       LEFT JOIN abmt_proposals ap ON ap.id = e.record_id
       WHERE e.status = 'published' AND ${c.sql} ORDER BY e.seq DESC LIMIT ?`,
    )
    .all(...c.params, limit) as {
    id: string;
    domain: Domain;
    stage: string;
    status: "draft" | "pending" | "published";
    confidentiality: "public" | "restricted" | "confidential";
    record_id: string;
    public_record_id: string | null;
    at: string;
    title: string;
  }[];
  return rows.map((r) => ({
    eventId: r.id,
    domain: r.domain,
    stage: r.stage,
    status: r.status,
    confidentiality: r.confidentiality,
    recordId: r.record_id,
    publicRecordId: r.public_record_id ?? undefined,
    title: r.title ?? "",
    at: r.at,
    provenanceBadge: provenanceBadgeForRecord(db, r.record_id),
  }));
}

export interface RailCounts {
  submit: number;
  manage: number;
  publish: number;
  notify: number;
  audit: number;
}

export function railCounts(db: Db, p: Principal): RailCounts {
  const c = eventClause(p);
  const count = (extra: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM events e ${RECORD_JOIN} WHERE ${c.sql} ${extra}`).get(...c.params) as { n: number }).n;
  const submit = listMgrBatches(db, p).length + listEiaActivities(db, p).length + listCbtmtRecords(db, p).length + listAbmtProposals(db, p).length;
  const uid = userId(p);
  const notify = uid ? (db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?").get(uid) as { n: number }).n : 0;
  return {
    submit,
    manage: count(
      "AND e.status = 'pending' AND e.seq = (SELECT MAX(x.seq) FROM events x WHERE x.record_id = e.record_id AND x.stage = e.stage AND x.version = e.version)",
    ),
    publish: count("AND e.status = 'published'"),
    notify,
    audit: count(""),
  };
}

// ------------------------------------------------------------------ resolver

export function resolvePublicRecord(db: Db, p: Principal, publicRecordId: string): { domain: Domain; recordId: string } | undefined {
  const row = db
    .prepare(
      `SELECT 'mgr' AS domain, id FROM mgr_batches WHERE public_record_id = ?
       UNION ALL SELECT 'eia', id FROM eia_activities WHERE public_record_id = ?
       UNION ALL SELECT 'cbtmt', id FROM cbtmt_records WHERE public_record_id = ?
       UNION ALL SELECT 'abmt', id FROM abmt_proposals WHERE public_record_id = ?`,
    )
    .get(publicRecordId, publicRecordId, publicRecordId, publicRecordId) as { domain: Domain; id: string } | undefined;
  if (!row) return undefined;
  return recordVisible(db, p, row.domain, row.id) ? { domain: row.domain, recordId: row.id } : undefined;
}

// ------------------------------------------------------------------ notifications / subscriptions

type NotificationRow = { id: string; user_id: string; event_id: string; kind: Notification["kind"]; at: string; read: number; summary: string };

export type NotificationView = Notification & { domain?: Domain; recordHref?: string };

export function notificationRecordLink(db: Db, eventId: string): { domain: Domain; recordHref: string } | undefined {
  const ev = getEvent(db, eventId);
  if (!ev) return undefined;
  return { domain: ev.domain, recordHref: domainPath(ev.domain, ev.recordId) };
}

export function notificationsFor(db: Db, p: Principal, limit = 50): NotificationView[] {
  const uid = userId(p);
  if (!uid) return [];
  const rows = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY at DESC, rowid DESC LIMIT ?").all(uid, limit) as NotificationRow[];
  return rows.map((r) => {
    const link = notificationRecordLink(db, r.event_id);
    return {
      id: r.id,
      userId: r.user_id,
      eventId: r.event_id,
      kind: r.kind,
      at: r.at,
      read: r.read === 1,
      summary: r.summary,
      domain: link?.domain,
      recordHref: link?.recordHref,
    };
  });
}

export function unreadCount(db: Db, p: Principal): number {
  const uid = userId(p);
  if (!uid) return 0;
  return (db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0").get(uid) as { n: number }).n;
}

export function markAllRead(db: Db, p: Principal): void {
  const uid = userId(p);
  if (!uid) return;
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(uid);
}

type SubRow = { id: string; user_id: string; themes_json: string; abnj_boxes_json: string; domains_json: string; digest: Subscription["digest"] };

export function getSubscription(db: Db, p: Principal): Subscription | undefined {
  const uid = userId(p);
  if (!uid) return undefined;
  const r = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(uid) as SubRow | undefined;
  return r ? { id: r.id, userId: r.user_id, themes: JSON.parse(r.themes_json), abnjBoxes: JSON.parse(r.abnj_boxes_json), domains: JSON.parse(r.domains_json), digest: r.digest } : undefined;
}

export function upsertSubscription(db: Db, sub: Subscription): void {
  db.prepare(
    `INSERT INTO subscriptions (id, user_id, themes_json, abnj_boxes_json, domains_json, digest) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET themes_json = excluded.themes_json, abnj_boxes_json = excluded.abnj_boxes_json,
       domains_json = excluded.domains_json, digest = excluded.digest`,
  ).run(sub.id, sub.userId, JSON.stringify(sub.themes), JSON.stringify(sub.abnjBoxes), JSON.stringify(sub.domains), sub.digest);
}
