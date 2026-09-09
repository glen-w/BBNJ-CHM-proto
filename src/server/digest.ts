/**
 * Digest runner — the other half of hold semantics in notify.ts.
 *
 * Subscribers with digest = daily/weekly receive no per-event bell for
 * subscription matches. runDigests() collects every published event since the
 * user's last window that (a) matches their subscription, (b) is visible to
 * them under the read policy and (c) they were not already told about
 * (owner / STB / material re-notify rows are immediate), then writes one
 * `digest` notification anchored on the newest such event plus a digest_runs
 * row. Idempotent: a second run over an unchanged database inserts nothing.
 */
import type { Db } from "@/lib/db";
import type { Domain } from "@/lib/contracts/events";
import { nowIso } from "./ids";
import { eventVisibleTo, publishSummaryOf, subscriptionMatches } from "./notify";
import { type EventRow, rowToEvent } from "./outbox";
import { requireCan, type Principal } from "./policy";
import { getRecordMeta } from "./records";
import { findUserById } from "./users";

export type DigestCadence = "daily" | "weekly";

export interface DigestUserResult {
  userId: string;
  username: string;
  cadence: DigestCadence;
  windowStart: string;
  windowEnd: string;
  eventCount: number;
  inserted: boolean;
  skipped?: "not_due" | "no_events";
}

export interface DigestRunResult {
  at: string;
  users: DigestUserResult[];
  inserted: number;
}

type SubRow = { id: string; user_id: string; themes_json: string; abnj_boxes_json: string; domains_json: string; digest: "immediate" | DigestCadence };

const EPOCH = "1970-01-01T00:00:00.000Z";
const CADENCE_MS: Record<DigestCadence, number> = { daily: 86400000, weekly: 7 * 86400000 };

export interface RunDigestsOptions {
  /** Window end; defaults to now. */
  now?: string;
  /** Restrict to one cadence. */
  cadence?: DigestCadence;
  /** When true, users whose last window ended less than one cadence ago are skipped. Default false (run on demand). */
  onlyDue?: boolean;
  /** Authorising principal for the UI/script path. Seeds call without one. */
  actor?: Principal;
}

export function runDigests(db: Db, opts: RunDigestsOptions = {}): DigestRunResult {
  if (opts.actor) requireCan(opts.actor, "run_digest", undefined, { db, path: "/notifications" });
  const now = opts.now ?? nowIso();
  const subs = (db.prepare("SELECT * FROM subscriptions WHERE digest <> 'immediate'").all() as SubRow[]).filter(
    (s) => !opts.cadence || s.digest === opts.cadence,
  );
  const results: DigestUserResult[] = [];
  let inserted = 0;

  for (const s of subs) {
    const user = findUserById(db, s.user_id);
    if (!user || !user.active) continue;
    const cadence = s.digest as DigestCadence;
    const last = db.prepare("SELECT window_end FROM digest_runs WHERE user_id = ? ORDER BY window_end DESC LIMIT 1").get(s.user_id) as { window_end: string } | undefined;
    const windowStart = last?.window_end ?? EPOCH;
    const base: Omit<DigestUserResult, "eventCount" | "inserted"> = { userId: s.user_id, username: user.username, cadence, windowStart, windowEnd: now };

    if (opts.onlyDue && last && new Date(now).getTime() - new Date(last.window_end).getTime() < CADENCE_MS[cadence]) {
      results.push({ ...base, eventCount: 0, inserted: false, skipped: "not_due" });
      continue;
    }

    // Published rows in the window the user has not already been notified about.
    const candidates = db
      .prepare(
        `SELECT e.* FROM events e
         WHERE e.status = 'published' AND e.at > ? AND e.at <= ?
           AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = ? AND n.event_id = e.id)
         ORDER BY e.seq ASC`,
      )
      .all(windowStart, now, s.user_id) as EventRow[];

    const picked: { event: ReturnType<typeof rowToEvent>; summary: string }[] = [];
    for (const row of candidates) {
      const event = rowToEvent(row);
      const meta = getRecordMeta(db, event.domain, event.recordId);
      if (!meta) continue;
      if (!subscriptionMatches(s, event.domain, meta)) continue;
      if (!eventVisibleTo(db, user, event.id)) continue;
      picked.push({ event, summary: publishSummaryOf(event, meta) });
    }

    if (picked.length === 0) {
      results.push({ ...base, eventCount: 0, inserted: false, skipped: "no_events" });
      continue;
    }

    const byDomain = new Map<Domain, number>();
    for (const p of picked) byDomain.set(p.event.domain, (byDomain.get(p.event.domain) ?? 0) + 1);
    const breakdown = Array.from(byDomain.entries())
      .map(([d, n]) => `${d.toUpperCase()} ${n}`)
      .join(" · ");
    const head = `${cadence === "daily" ? "Daily" : "Weekly"} digest: ${picked.length} published pack${picked.length === 1 ? "" : "s"} — ${breakdown}.`;
    const lines = picked.slice(0, 5).map((p) => p.summary);
    const more = picked.length > 5 ? ` … and ${picked.length - 5} more` : "";
    const summary = `${head} ${lines.join(" | ")}${more}`.slice(0, 1000);
    const anchor = picked[picked.length - 1].event;
    const notificationId = crypto.randomUUID();

    const tx = db.transaction((): boolean => {
      const ins = db
        .prepare("INSERT OR IGNORE INTO notifications(id, user_id, event_id, kind, at, read, summary) VALUES (?, ?, ?, 'digest', ?, 0, ?)")
        .run(notificationId, s.user_id, anchor.id, now, summary);
      db.prepare(
        `INSERT OR IGNORE INTO digest_runs(id, user_id, window_start, window_end, at, event_count, notification_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(crypto.randomUUID(), s.user_id, windowStart, now, now, picked.length, ins.changes ? notificationId : null);
      return ins.changes === 1;
    });
    const did = tx();
    if (did) inserted++;
    results.push({ ...base, eventCount: picked.length, inserted: did });
  }
  return { at: now, users: results, inserted };
}

export interface DigestRunRow {
  id: string;
  userId: string;
  username: string;
  windowStart: string;
  windowEnd: string;
  at: string;
  eventCount: number;
}

/** Secretariat projection: recent digest windows. */
export function listDigestRuns(db: Db, limit = 50): DigestRunRow[] {
  const rows = db
    .prepare(
      `SELECT d.*, u.username FROM digest_runs d JOIN users u ON u.id = d.user_id ORDER BY d.at DESC LIMIT ?`,
    )
    .all(limit) as { id: string; user_id: string; username: string; window_start: string; window_end: string; at: string; event_count: number }[];
  return rows.map((r) => ({ id: r.id, userId: r.user_id, username: r.username, windowStart: r.window_start, windowEnd: r.window_end, at: r.at, eventCount: r.event_count }));
}
