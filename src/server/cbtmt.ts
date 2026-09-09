/**
 * CBTMT journey — Lock 4: a match is a row (needId, offerId, rule, at) plus a
 * match_suggested outbox event carrying matchId. No ML.
 */
import type { Db } from "@/lib/db";
import { CbtmtMatch } from "@/lib/contracts/events";
import { StoredCbtmtRecord, type IdempotencyKey, type StoredEvent } from "@/lib/contracts/extensions";
import { DomainError } from "./errors";
import { nowIso } from "./ids";
import { dispatch } from "./notify";
import { findEventByKey, insertEvent, latestPackRow } from "./outbox";
import { openPack, type PackResult } from "./packs";
import { actorRoleOf, hasRole, isSecretariat, requireCan, type Principal, userId } from "./policy";
import { refreshCaches } from "./records";

type CbtmtRow = {
  id: string;
  kind: "need" | "offer";
  public_record_id: string | null;
  stage: "need_posted" | "offer_posted";
  title: string;
  themes_json: string;
  party_code: string | null;
  provider: string | null;
  source_channel: "form" | "excel" | "assisted";
  confidentiality: "public" | "restricted" | "confidential";
  version: number;
  owner_user_id: string | null;
  updated_at: string;
};

export function rowToCbtmt(row: CbtmtRow): StoredCbtmtRecord {
  const base = {
    domain: "cbtmt" as const,
    kind: row.kind,
    id: row.id,
    publicRecordId: row.public_record_id ?? undefined,
    stage: row.stage,
    title: row.title,
    themes: JSON.parse(row.themes_json),
    sourceChannel: row.source_channel,
    confidentiality: row.confidentiality,
    version: row.version,
    ownerUserId: row.owner_user_id ?? undefined,
    updatedAt: row.updated_at,
  };
  return StoredCbtmtRecord.parse(row.kind === "need" ? { ...base, partyCode: row.party_code } : { ...base, provider: row.provider });
}

export function getCbtmtRecord(db: Db, id: string): StoredCbtmtRecord | undefined {
  const row = db.prepare("SELECT * FROM cbtmt_records WHERE id = ?").get(id) as CbtmtRow | undefined;
  return row ? rowToCbtmt(row) : undefined;
}

export interface CbtmtResult extends PackResult {
  record: StoredCbtmtRecord;
}

export function normaliseThemes(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : (raw ?? "").split(",");
  return Array.from(new Set(list.map((t) => t.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean)));
}

/** Create a need or offer with its pending pack in one transaction. */
export function createCbtmtRecord(
  db: Db,
  actor: Principal,
  input: { kind: "need" | "offer"; title: string; themes: string[] | string; partyCode?: string; provider?: string; confidentiality?: "public" | "restricted" | "confidential" },
  key: IdempotencyKey,
): CbtmtResult {
  requireCan(actor, "submit", { domain: "cbtmt", recordKind: input.kind }, { domain: "cbtmt", db });
  const existing = findEventByKey(db, key);
  if (existing) return { record: getCbtmtRecord(db, existing.recordId)!, event: existing, created: false };
  const title = input.title.trim();
  if (!title) throw new DomainError("validation", "Title is required");
  const themes = normaliseThemes(input.themes);
  if (themes.length === 0) throw new DomainError("validation", "At least one theme is required");
  let partyCode: string | null = null;
  let provider: string | null = null;
  if (input.kind === "need") {
    partyCode = hasRole(actor, "party") && actor.kind === "user" && actor.user.partyCode ? actor.user.partyCode : (input.partyCode ?? "").toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(partyCode)) throw new DomainError("validation", "A Party code (2–3 letters) is required for a need");
  } else {
    provider = (input.provider ?? "").trim();
    if (!provider) throw new DomainError("validation", "Provider is required for an offer");
  }
  const stage = input.kind === "need" ? "need_posted" : "offer_posted";
  const tx = db.transaction((): CbtmtResult => {
    const id = crypto.randomUUID();
    const at = nowIso();
    db.prepare(
      `INSERT INTO cbtmt_records (id, kind, stage, title, themes_json, party_code, provider, source_channel, confidentiality, version, owner_user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, input.kind, stage, title, JSON.stringify(themes), partyCode, provider, isSecretariat(actor) ? "assisted" : "form", input.confidentiality ?? "public", userId(actor) ?? null, at);
    const res = openPack(db, actor, {
      domain: "cbtmt",
      recordId: id,
      stage,
      status: "pending",
      summary: input.kind === "need" ? `Capacity need posted: ${title}` : `Support offer posted: ${title}`,
      idempotencyKey: key,
      at,
    });
    return { record: getCbtmtRecord(db, id)!, event: res.event, created: true };
  });
  return tx();
}

export interface MatchResult {
  match: CbtmtMatch;
  event?: StoredEvent;
  created: boolean;
}

function isPublished(db: Db, recordId: string, stage: string): boolean {
  return latestPackRow(db, recordId, stage)?.status === "published";
}

/** Insert-or-ignore the match; only a newly inserted row gets a match_suggested event. One transaction. */
export function suggestMatch(db: Db, actor: Principal, needId: string, offerId: string, rule: string, key: IdempotencyKey): MatchResult {
  requireCan(actor, "suggest_match", undefined, { domain: "cbtmt", recordId: needId, db });
  const need = getCbtmtRecord(db, needId);
  const offer = getCbtmtRecord(db, offerId);
  if (!need || need.kind !== "need") throw new DomainError("not_found", "Need not found");
  if (!offer || offer.kind !== "offer") throw new DomainError("not_found", "Offer not found");
  if (needId === offerId) throw new DomainError("validation", "Need and offer must differ");
  if (!isPublished(db, needId, "need_posted") || !isPublished(db, offerId, "offer_posted")) {
    throw new DomainError("invalid_transition", "Both the need and the offer must be published before matching");
  }
  const tx = db.transaction((): MatchResult => {
    const existingRow = db.prepare("SELECT * FROM cbtmt_matches WHERE need_id = ? AND offer_id = ?").get(needId, offerId) as
      | { id: string; need_id: string; offer_id: string; rule: string; at: string; facilitation_note: string | null }
      | undefined;
    if (existingRow) {
      return {
        match: CbtmtMatch.parse({ id: existingRow.id, needId: existingRow.need_id, offerId: existingRow.offer_id, rule: existingRow.rule, at: existingRow.at }),
        created: false,
      };
    }
    const match = CbtmtMatch.parse({ id: crypto.randomUUID(), needId, offerId, rule: rule.trim() || "manual", at: nowIso() });
    const ins = db.prepare("INSERT OR IGNORE INTO cbtmt_matches (id, need_id, offer_id, rule, at, facilitation_note) VALUES (?, ?, ?, ?, ?, NULL)").run(match.id, match.needId, match.offerId, match.rule, match.at);
    if (ins.changes === 0) throw new DomainError("invalid_transition", "Match already exists");
    const event = insertEvent(
      db,
      {
        id: crypto.randomUUID(),
        domain: "cbtmt",
        stage: "match_suggested",
        status: "published",
        recordId: needId,
        relatedRecordId: offerId,
        matchId: match.id,
        version: 1,
        actorRole: actorRoleOf(actor),
        actorUserId: userId(actor),
        at: match.at,
        summary: `Match suggested (${match.rule}): "${need.title}" ↔ "${offer.title}"`,
        artifactRefs: [],
        confidentiality: need.confidentiality,
        publicRecordId: need.publicRecordId,
      },
      key,
    );
    refreshCaches(db, "cbtmt", needId);
    return { match, event, created: true };
  });
  const result = tx();
  if (result.created && result.event) dispatch(db, result.event.id);
  return result;
}

/** Secretariat facilitation note on an existing match (human brokerage pattern; not ML). */
export function setMatchFacilitationNote(db: Db, actor: Principal, matchId: string, note: string): MatchView {
  requireCan(actor, "suggest_match", undefined, { domain: "cbtmt", recordId: matchId, db });
  const text = note.trim();
  if (!text) throw new DomainError("validation", "Facilitation note is required");
  const row = db.prepare("SELECT * FROM cbtmt_matches WHERE id = ?").get(matchId) as
    | { id: string; need_id: string; offer_id: string; rule: string; at: string; facilitation_note: string | null }
    | undefined;
  if (!row) throw new DomainError("not_found", "Match not found");
  db.prepare("UPDATE cbtmt_matches SET facilitation_note = ? WHERE id = ?").run(text, matchId);
  const views = matchesForRecord(db, row.need_id);
  const view = views.find((m) => m.id === matchId);
  if (!view) throw new DomainError("not_found", "Match not found after update");
  return view;
}

/** Deterministic rule: every published need × offer sharing a theme. */
export function suggestMatches(db: Db, actor: Principal, key: IdempotencyKey): MatchResult[] {
  requireCan(actor, "suggest_match", undefined, { domain: "cbtmt", db });
  const rows = db.prepare("SELECT * FROM cbtmt_records").all() as CbtmtRow[];
  const needs = rows.filter((r) => r.kind === "need" && isPublished(db, r.id, "need_posted"));
  const offers = rows.filter((r) => r.kind === "offer" && isPublished(db, r.id, "offer_posted"));
  const out: MatchResult[] = [];
  for (const n of needs) {
    const nt: string[] = JSON.parse(n.themes_json);
    for (const o of offers) {
      const ot: string[] = JSON.parse(o.themes_json);
      const shared = nt.find((t) => ot.includes(t));
      if (!shared) continue;
      out.push(suggestMatch(db, actor, n.id, o.id, `shared_theme:${shared}`, `${key}:${n.id}:${o.id}`.slice(0, 128)));
    }
  }
  return out;
}

export interface MatchView extends CbtmtMatch {
  needTitle: string;
  offerTitle: string;
  facilitationNote?: string;
}

export function matchesForRecord(db: Db, recordId: string): MatchView[] {
  const rows = db
    .prepare(
      `SELECT m.*, n.title AS need_title, o.title AS offer_title FROM cbtmt_matches m
       JOIN cbtmt_records n ON n.id = m.need_id JOIN cbtmt_records o ON o.id = m.offer_id
       WHERE m.need_id = ? OR m.offer_id = ? ORDER BY m.at DESC`,
    )
    .all(recordId, recordId) as {
    id: string;
    need_id: string;
    offer_id: string;
    rule: string;
    at: string;
    facilitation_note: string | null;
    need_title: string;
    offer_title: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    needId: r.need_id,
    offerId: r.offer_id,
    rule: r.rule,
    at: r.at,
    facilitationNote: r.facilitation_note ?? undefined,
    needTitle: r.need_title,
    offerTitle: r.offer_title,
  }));
}

export function listMatches(db: Db): MatchView[] {
  const rows = db
    .prepare(
      `SELECT m.*, n.title AS need_title, o.title AS offer_title FROM cbtmt_matches m
       JOIN cbtmt_records n ON n.id = m.need_id JOIN cbtmt_records o ON o.id = m.offer_id
       ORDER BY m.at DESC`,
    )
    .all() as {
    id: string;
    need_id: string;
    offer_id: string;
    rule: string;
    at: string;
    facilitation_note: string | null;
    need_title: string;
    offer_title: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    needId: r.need_id,
    offerId: r.offer_id,
    rule: r.rule,
    at: r.at,
    facilitationNote: r.facilitation_note ?? undefined,
    needTitle: r.need_title,
    offerTitle: r.offer_title,
  }));
}
