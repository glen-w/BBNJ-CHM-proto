import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ASSIST_OVERLAYS_META_KEY, assistOverlaysEnabled } from "@/lib/assist-overlays";
import type { AbnjBox } from "@/lib/contracts/events";
import type { ResearchItem } from "@/lib/contracts/extensions";
import type { Db } from "@/lib/db";
import { buildResearchGraph, type ResearchGraph } from "@/lib/research-graph";
import { featuresForAbnjBox, parseVmeGeoJson, type VmeFeatureCollection } from "@/lib/rfmo-vme";
import { listPublishedResearch } from "./research";

export function isAssistOverlaysEnabled(db: Db): boolean {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(ASSIST_OVERLAYS_META_KEY) as { value: string } | undefined;
  return assistOverlaysEnabled(row?.value);
}

export function setAssistOverlaysEnabled(db: Db, enabled: boolean): void {
  db.prepare(
    `INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(ASSIST_OVERLAYS_META_KEY, enabled ? "1" : "0");
}

let vmeCache: VmeFeatureCollection | null = null;

export function loadVmeClosures(): VmeFeatureCollection {
  if (vmeCache) return vmeCache;
  const path = join(process.cwd(), "fixtures/assist/rfmo-vme-closures.geojson");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  vmeCache = parseVmeGeoJson(raw as { features: Array<{ properties: { layerId: string; rfmo: string; label: string }; geometry: { type: string; coordinates: number[][][] } }> });
  return vmeCache;
}

export function vmeFeaturesForBox(box: AbnjBox) {
  return featuresForAbnjBox(loadVmeClosures(), box);
}

export function researchGraphForDesk(db: Db, items?: ResearchItem[]): ResearchGraph {
  const list = items ?? listPublishedResearch(db);
  return buildResearchGraph(list);
}

export type CorpusChunk = {
  id: string;
  source: "treaty" | "literature";
  title: string;
  text: string;
  href?: string;
};

let treatyChunksCache: CorpusChunk[] | null = null;

function loadTreatyChunks(): CorpusChunk[] {
  if (treatyChunksCache) return treatyChunksCache;
  const path = join(process.cwd(), "fixtures/assist/treaty-excerpts.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as Array<{
    id: string;
    source: string;
    article: string;
    text: string;
  }>;
  treatyChunksCache = rows.map((r) => ({
    id: r.id,
    source: "treaty",
    title: r.article,
    text: r.text,
    href: "https://www.un.org/bbnjagreement/en",
  }));
  return treatyChunksCache;
}

export function corpusChunks(db: Db): CorpusChunk[] {
  const treaty = loadTreatyChunks();
  const lit = listPublishedResearch(db).map((item) => ({
    id: item.id,
    source: "literature" as const,
    title: item.title,
    text: [item.citation, item.summarySnippet].filter(Boolean).join(" — ") || item.title,
    href: item.oaUrl ?? (item.doi ? `https://doi.org/${item.doi}` : undefined),
  }));
  return [...treaty, ...lit];
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export type CorpusAskHit = {
  chunk: CorpusChunk;
  score: number;
};

export function localCorpusAsk(
  db: Db,
  question: string,
  scope: "all" | "treaty" | "literature",
  limit = 5,
): CorpusAskHit[] {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];
  const chunks = corpusChunks(db).filter((c) => scope === "all" || c.source === scope);
  const scored: CorpusAskHit[] = [];
  for (const chunk of chunks) {
    const hay = `${chunk.title} ${chunk.text}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ chunk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function paperfulCorpusAsk(
  question: string,
  scope: string,
): Promise<{ answer: string; citations: Array<{ title: string; href?: string }> } | null> {
  const base = process.env.PAPERFUL_ASK_URL?.trim();
  if (!base) return null;
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ question, scope }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      answer?: string;
      citations?: Array<{ title?: string; href?: string }>;
    };
    if (!body.answer?.trim()) return null;
    return {
      answer: body.answer.trim(),
      citations: (body.citations ?? []).map((c) => ({
        title: c.title?.trim() || "Source",
        href: c.href,
      })),
    };
  } catch {
    return null;
  }
}
