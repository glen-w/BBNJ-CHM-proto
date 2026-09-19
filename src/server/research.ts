/**
 * Related-research catalog — published slice + link-out, not a pack domain.
 * Zotero remains the catalog of record. Prefer oa_url; file_id is licence-gated
 * and unused in P0.
 */
import { AbnjBox, Domain } from "@/lib/contracts/events";
import {
  ResearchIfb,
  ResearchItem,
  ResearchStatus,
  type StoredAbmtProposal,
} from "@/lib/contracts/extensions";
import type { Db } from "@/lib/db";
import { RESEARCH_LANE_META_KEY, researchLaneEnabled } from "@/lib/research-lane";
import { DomainError } from "./errors";
import { nowIso } from "./ids";

export type ResearchFacets = {
  pillars: Domain[];
  geographies: AbnjBox[];
  ifbs: ResearchIfb[];
};

export type ResearchItemInput = {
  zoteroKey?: string;
  doi?: string;
  title: string;
  year?: number;
  citation?: string;
  oaUrl?: string;
  fileId?: string;
  licence?: string;
  status: ResearchStatus;
  pillars: Domain[];
  geographies: AbnjBox[];
  ifbs: ResearchIfb[];
  summarySnippet?: string;
};

type ResearchRow = {
  id: string;
  zotero_key: string | null;
  doi: string | null;
  title: string;
  year: number | null;
  citation: string | null;
  oa_url: string | null;
  file_id: string | null;
  licence: string | null;
  status: string;
  pillars_json: string;
  geographies_json: string;
  ifbs_json: string;
  summary_snippet: string | null;
  created_at: string;
  updated_at: string;
};

function parseJsonArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function overlap<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

export function rowToResearch(row: ResearchRow): ResearchItem {
  return ResearchItem.parse({
    id: row.id,
    zoteroKey: row.zotero_key ?? undefined,
    doi: row.doi ?? undefined,
    title: row.title,
    year: row.year ?? undefined,
    citation: row.citation ?? undefined,
    oaUrl: row.oa_url ?? undefined,
    fileId: row.file_id ?? undefined,
    licence: row.licence ?? undefined,
    status: row.status,
    pillars: parseJsonArray(row.pillars_json),
    geographies: parseJsonArray(row.geographies_json),
    ifbs: parseJsonArray(row.ifbs_json),
    summarySnippet: row.summary_snippet ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function getResearchItem(db: Db, id: string): ResearchItem | undefined {
  const row = db.prepare("SELECT * FROM research_items WHERE id = ?").get(id) as ResearchRow | undefined;
  return row ? rowToResearch(row) : undefined;
}

function findExisting(db: Db, input: ResearchItemInput): ResearchRow | undefined {
  if (input.zoteroKey) {
    const byKey = db.prepare("SELECT * FROM research_items WHERE zotero_key = ?").get(input.zoteroKey) as ResearchRow | undefined;
    if (byKey) return byKey;
  }
  if (input.doi) {
    const byDoi = db.prepare("SELECT * FROM research_items WHERE doi = ?").get(input.doi) as ResearchRow | undefined;
    if (byDoi) return byDoi;
  }
  const byTitle = db.prepare("SELECT * FROM research_items WHERE title = ?").get(input.title) as ResearchRow | undefined;
  return byTitle;
}

function bindRow(input: ResearchItemInput): {
  zoteroKey: string | null;
  doi: string | null;
  title: string;
  year: number | null;
  citation: string | null;
  oaUrl: string | null;
  fileId: string | null;
  licence: string | null;
  status: ResearchStatus;
  pillarsJson: string;
  geographiesJson: string;
  ifbsJson: string;
  summarySnippet: string | null;
} {
  const title = input.title.trim();
  if (!title) throw new DomainError("validation", "Title is required");
  const status = ResearchStatus.parse(input.status);
  const pillars = input.pillars.map((p) => Domain.parse(p));
  const geographies = input.geographies.map((g) => AbnjBox.parse(g));
  const ifbs = input.ifbs.map((i) => ResearchIfb.parse(i));
  return {
    zoteroKey: input.zoteroKey?.trim() || null,
    doi: input.doi?.trim() || null,
    title,
    year: input.year ?? null,
    citation: input.citation?.trim() || null,
    oaUrl: input.oaUrl?.trim() || null,
    fileId: input.fileId?.trim() || null,
    licence: input.licence?.trim() || null,
    status,
    pillarsJson: JSON.stringify(pillars),
    geographiesJson: JSON.stringify(geographies),
    ifbsJson: JSON.stringify(ifbs),
    summarySnippet: input.summarySnippet?.trim() || null,
  };
}

/** Insert or update by zotero_key, then doi, then title. Seed-safe (idempotent). */
export function upsertResearchItem(db: Db, input: ResearchItemInput): { item: ResearchItem; created: boolean } {
  const bound = bindRow(input);
  const existing = findExisting(db, input);
  const at = nowIso();
  if (existing) {
    db.prepare(
      `UPDATE research_items SET
        zotero_key = ?, doi = ?, title = ?, year = ?, citation = ?, oa_url = ?, file_id = ?, licence = ?,
        status = ?, pillars_json = ?, geographies_json = ?, ifbs_json = ?, summary_snippet = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      bound.zoteroKey,
      bound.doi,
      bound.title,
      bound.year,
      bound.citation,
      bound.oaUrl,
      bound.fileId,
      bound.licence,
      bound.status,
      bound.pillarsJson,
      bound.geographiesJson,
      bound.ifbsJson,
      bound.summarySnippet,
      at,
      existing.id,
    );
    return { item: getResearchItem(db, existing.id)!, created: false };
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO research_items (
      id, zotero_key, doi, title, year, citation, oa_url, file_id, licence,
      status, pillars_json, geographies_json, ifbs_json, summary_snippet, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    bound.zoteroKey,
    bound.doi,
    bound.title,
    bound.year,
    bound.citation,
    bound.oaUrl,
    bound.fileId,
    bound.licence,
    bound.status,
    bound.pillarsJson,
    bound.geographiesJson,
    bound.ifbsJson,
    bound.summarySnippet,
    at,
    at,
  );
  return { item: getResearchItem(db, id)!, created: true };
}

export function listPublishedResearch(db: Db): ResearchItem[] {
  const rows = db.prepare("SELECT * FROM research_items WHERE status = 'published' ORDER BY year DESC, title ASC").all() as ResearchRow[];
  return rows.map(rowToResearch);
}

/**
 * Published items that share at least one pillar, geography, or IFB with `facets`.
 * Used by later desks; ABMT P0 uses `listRelatedResearchForAbmt` so implicit
 * pillar `abmt` does not list every ABMT-tagged paper on every proposal.
 */
export function listRelatedResearch(db: Db, facets: ResearchFacets): ResearchItem[] {
  return listPublishedResearch(db).filter(
    (item) =>
      overlap(item.pillars, facets.pillars) || overlap(item.geographies, facets.geographies) || overlap(item.ifbs, facets.ifbs),
  );
}

/** Facets stored on an ABMT stub: implicit pillar `abmt` plus persisted geography. */
export function abmtResearchFacets(proposal: StoredAbmtProposal): ResearchFacets {
  return {
    pillars: ["abmt"],
    geographies: proposal.abnjBox ? [proposal.abnjBox] : [],
    ifbs: [],
  };
}

/**
 * Desk panel query: published items tagged `pillar` that share `geography`.
 * No recognised geography → empty (a free-text location hint does not invent a join).
 */
export function listRelatedResearchForPillar(db: Db, pillar: Domain, geography: string | undefined): ResearchItem[] {
  const box = AbnjBox.safeParse(geography);
  if (!box.success) return [];
  return listPublishedResearch(db).filter((item) => item.pillars.includes(pillar) && item.geographies.includes(box.data));
}

export function listRelatedResearchForAbmt(db: Db, proposal: StoredAbmtProposal): ResearchItem[] {
  const facets = abmtResearchFacets(proposal);
  if (facets.geographies.length === 0 && facets.ifbs.length === 0) return [];
  return listPublishedResearch(db).filter((item) => {
    if (!item.pillars.includes("abmt")) return false;
    return overlap(item.geographies, facets.geographies) || overlap(item.ifbs, facets.ifbs);
  });
}

export function openHrefForResearch(item: Pick<ResearchItem, "oaUrl" | "doi">): string | undefined {
  if (item.oaUrl) return item.oaUrl;
  if (item.doi) return `https://doi.org/${item.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`;
  return undefined;
}

export function isResearchLaneEnabled(db: Db): boolean {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(RESEARCH_LANE_META_KEY) as { value: string } | undefined;
  return researchLaneEnabled(row?.value);
}

export function setResearchLaneEnabled(db: Db, enabled: boolean): void {
  db.prepare(
    `INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(RESEARCH_LANE_META_KEY, enabled ? "1" : "0");
}
