import type { ResearchItem } from "@/lib/contracts/extensions";

export type ResearchGraphNode = {
  id: string;
  label: string;
  kind: "paper";
  year?: number;
  href?: string;
  hint?: string;
};

export type ResearchGraphLink = {
  source: string;
  target: string;
  reason: "geography" | "geography_ifb";
  weight: number;
};

export type ResearchGraph = {
  nodes: ResearchGraphNode[];
  links: ResearchGraphLink[];
  /** Papers omitted because they have no place tags (nothing to anchor). */
  omittedNoPlace: number;
};

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

function linkWeight(a: ResearchItem, b: ResearchItem): { weight: number; reason: ResearchGraphLink["reason"] } | null {
  const geos = overlap(a.geographies, b.geographies);
  if (geos.length === 0) return null;
  const sharedIfb = overlap(a.ifbs, b.ifbs).length;
  const weight = geos.length * 3 + overlap(a.pillars, b.pillars).length + sharedIfb;
  return { weight, reason: sharedIfb > 0 ? "geography_ifb" : "geography" };
}

export type BuildResearchGraphOptions = {
  maxNodes?: number;
  maxDegree?: number;
  openHref?: (item: ResearchItem) => string | undefined;
};

/** Facet graph: edges only when two papers share a seeded place (ABNJ box keyword). */
export function buildResearchGraph(items: ResearchItem[], opts: BuildResearchGraphOptions = {}): ResearchGraph {
  const maxNodes = opts.maxNodes ?? 36;
  const maxDegree = opts.maxDegree ?? 6;
  const withPlace = items.filter((item) => item.geographies.length > 0);
  const omittedNoPlace = items.length - withPlace.length;
  const sorted = [...withPlace].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const slice = sorted.slice(0, maxNodes);

  const nodes: ResearchGraphNode[] = slice.map((item) => ({
    id: item.id,
    label: item.title.length > 72 ? `${item.title.slice(0, 69)}…` : item.title,
    kind: "paper",
    year: item.year,
    href: opts.openHref?.(item),
    hint: item.citation ?? item.geographies.join(" · "),
  }));

  const degree = new Map<string, number>();
  const candidates: ResearchGraphLink[] = [];
  for (let i = 0; i < slice.length; i++) {
    for (let j = i + 1; j < slice.length; j++) {
      const scored = linkWeight(slice[i], slice[j]);
      if (!scored) continue;
      candidates.push({
        source: slice[i].id,
        target: slice[j].id,
        reason: scored.reason,
        weight: scored.weight,
      });
    }
  }
  candidates.sort((a, b) => b.weight - a.weight);

  const links: ResearchGraphLink[] = [];
  for (const edge of candidates) {
    const da = degree.get(edge.source) ?? 0;
    const db = degree.get(edge.target) ?? 0;
    if (da >= maxDegree || db >= maxDegree) continue;
    links.push(edge);
    degree.set(edge.source, da + 1);
    degree.set(edge.target, db + 1);
  }

  return { nodes, links, omittedNoPlace };
}
