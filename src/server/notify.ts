/**
 * Outbox dispatcher. Synchronous, after commit, no queue.
 * Recipients = (record owner ∪ subscription matches ∪ role targets) ∩ users
 * permitted by readPolicy for that event. Insert-or-ignore under
 * UNIQUE(user_id, event_id, kind); outcome recorded in dispatch_log.
 * Failures are logged, never re-thrown into the business path.
 */
import type { Db } from "@/lib/db";
import type { User } from "@/lib/contracts/events";
import { DEMO_COMMENT_WINDOW_DAYS, type NotificationKind } from "@/lib/contracts/extensions";
import type { StoredEvent } from "@/lib/contracts/extensions";
import { nowIso } from "./ids";
import { getEvent, type EventRow, rowToEvent } from "./outbox";
import { RECORD_JOIN, principalFor, readPolicy, visibilityClause } from "./policy";
import { getRecordMeta, type RecordMeta } from "./records";
import { listUsers } from "./users";

export interface DispatchResult {
  eventId: string;
  inserted: number;
  recipients: number;
  error?: string;
}

type Target = { userId: string; kind: NotificationKind; summary: string };

type SubRow = { user_id: string; themes_json: string; abnj_boxes_json: string; domains_json: string };

function subscribersFor(db: Db, event: StoredEvent, meta: RecordMeta): Set<string> {
  const out = new Set<string>();
  const subs = db.prepare("SELECT user_id, themes_json, abnj_boxes_json, domains_json FROM subscriptions").all() as SubRow[];
  for (const s of subs) {
    const domains: string[] = JSON.parse(s.domains_json);
    const boxes: string[] = JSON.parse(s.abnj_boxes_json);
    const themes: string[] = JSON.parse(s.themes_json);
    if (domains.includes(event.domain)) out.add(s.user_id);
    if (meta.abnjBox && boxes.includes(meta.abnjBox)) out.add(s.user_id);
    if (meta.themes && meta.themes.some((t) => themes.includes(t))) out.add(s.user_id);
  }
  return out;
}

/** Is this event readable by this user under the single read policy? */
export function eventVisibleTo(db: Db, user: User, eventId: string): boolean {
  const pol = readPolicy(principalFor(user));
  const clause = visibilityClause(pol, { status: "e.status", tier: "e.confidentiality", owner: "r.owner_user_id" });
  const row = db.prepare(`SELECT e.id FROM events e ${RECORD_JOIN} WHERE e.id = ? AND ${clause.sql}`).get(eventId, ...clause.params);
  return !!row;
}

function targetsFor(db: Db, event: StoredEvent, meta: RecordMeta): Target[] {
  const targets: Target[] = [];
  const label = meta.publicRecordId ?? event.publicRecordId ?? meta.title;
  const publishSummary = `${event.domain.toUpperCase()} · ${event.stage.replace(/_/g, " ")} published — ${label}`;

  if (meta.ownerUserId) targets.push({ userId: meta.ownerUserId, kind: "publish", summary: publishSummary });
  for (const uid of subscribersFor(db, event, meta)) targets.push({ userId: uid, kind: "publish", summary: publishSummary });

  if (event.domain === "eia" && event.stage === "draft_eia") {
    for (const stbUser of listUsers(db).filter((u) => u.active && u.roles.includes("stb"))) {
      targets.push({ userId: stbUser.id, kind: "stb_review", summary: `Draft EIA published for STB review — ${label} (Arts 34–35)` });
    }
    const closes = new Date(new Date(event.at).getTime() + DEMO_COMMENT_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
    const deadlineSummary = `Comment window on draft EIA ${label} closes ${closes} (demo: ${DEMO_COMMENT_WINDOW_DAYS} days — the Agreement fixes no day count here)`;
    for (const uid of subscribersFor(db, event, meta)) targets.push({ userId: uid, kind: "deadline", summary: deadlineSummary });
    if (meta.ownerUserId) targets.push({ userId: meta.ownerUserId, kind: "deadline", summary: deadlineSummary });
  }

  if (event.domain === "cbtmt" && event.stage === "match_suggested") {
    const offerMeta = event.relatedRecordId ? getRecordMeta(db, "cbtmt", event.relatedRecordId) : undefined;
    const summary = `Capacity match suggested: "${meta.title}" ↔ "${offerMeta?.title ?? "offer"}"`;
    if (meta.ownerUserId) targets.push({ userId: meta.ownerUserId, kind: "match", summary });
    if (offerMeta?.ownerUserId) targets.push({ userId: offerMeta.ownerUserId, kind: "match", summary });
  }
  return targets;
}

/** Idempotent fan-out for one event. Non-published events never notify. */
export function dispatch(db: Db, eventId: string): DispatchResult {
  const event = getEvent(db, eventId);
  if (!event) return { eventId, inserted: 0, recipients: 0, error: "event not found" };
  if (event.status !== "published") return { eventId, inserted: 0, recipients: 0 };

  const at = nowIso();
  try {
    const meta = getRecordMeta(db, event.domain, event.recordId);
    if (!meta) throw new Error("record not found for event");
    const users = new Map(listUsers(db).map((u) => [u.id, u]));
    const targets = targetsFor(db, event, meta).filter((t) => {
      const u = users.get(t.userId);
      return u && u.active && eventVisibleTo(db, u, event.id);
    });
    const insert = db.prepare(
      `INSERT OR IGNORE INTO notifications(id, user_id, event_id, kind, at, read, summary) VALUES (?, ?, ?, ?, ?, 0, ?)`,
    );
    const tx = db.transaction(() => {
      let inserted = 0;
      for (const t of targets) {
        inserted += insert.run(crypto.randomUUID(), t.userId, event.id, t.kind, event.at, t.summary).changes;
      }
      db.prepare(
        `INSERT INTO dispatch_log(event_id, at, delivered_count, error) VALUES (?, ?, ?, NULL)
         ON CONFLICT(event_id) DO UPDATE SET at = excluded.at, delivered_count = delivered_count + excluded.delivered_count, error = NULL`,
      ).run(event.id, at, inserted);
      return inserted;
    });
    const inserted = tx();
    return { eventId, inserted, recipients: targets.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare(
      `INSERT INTO dispatch_log(event_id, at, delivered_count, error) VALUES (?, ?, 0, ?)
       ON CONFLICT(event_id) DO UPDATE SET at = excluded.at, error = excluded.error`,
    ).run(event.id, at, message);
    console.error(`[dispatch] ${eventId}: ${message}`);
    return { eventId, inserted: 0, recipients: 0, error: message };
  }
}

/** Re-run dispatch over every published event. Consistent DB → zero inserts. */
export function replayOutbox(db: Db): { events: number; inserted: number; errors: number } {
  const rows = db.prepare("SELECT * FROM events WHERE status = 'published' ORDER BY seq ASC").all() as EventRow[];
  let inserted = 0;
  let errors = 0;
  for (const r of rows) {
    const res = dispatch(db, rowToEvent(r).id);
    inserted += res.inserted;
    if (res.error) errors++;
  }
  return { events: rows.length, inserted, errors };
}
