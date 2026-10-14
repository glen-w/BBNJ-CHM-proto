import type { ResearchItem } from "@/lib/contracts/extensions";

export type ResearchGraphNode = {
  id: string;
  label: string;
  kind: "paper";
  year?: number;
};

export type ResearchGraphLink = {
  source: string;
  target: string;
  reason: "pillar" | "geography" | "ifb";
};

export type ResearchGraph = {
  nodes: ResearchGraphNode[];
  links: ResearchGraphLink[];
};

function shareReason(a: ResearchItem, b: ResearchItem): ResearchGraphLink["reason"] | null {
  if (a.pillars.some((p) => b.pillars.includes(p))) return "pillar";
  if (a.geographies.some((g) => b.geographies.includes(g))) return "geography";
  if (a.ifbs.some((i) => b.ifbs.includes(i))) return "ifb";
  return null;
}

/** Facet co-occurrence graph from the published literature slice (no citation edges). */
export function buildResearchGraph(items: ResearchItem[], maxNodes = 48): ResearchGraph {
  const sorted = [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const slice = sorted.slice(0, maxNodes);
  const nodes: ResearchGraphNode[] = slice.map((item) => ({
    id: item.id,
    label: item.title.length > 56 ? `${item.title.slice(0, 53)}…` : item.title,
    kind: "paper",
    year: item.year,
  }));
  const links: ResearchGraphLink[] = [];
  for (let i = 0; i < slice.length; i++) {
    for (let j = i + 1; j < slice.length; j++) {
      const reason = shareReason(slice[i], slice[j]);
      if (!reason) continue;
      links.push({ source: slice[i].id, target: slice[j].id, reason });
    }
  }
  return { nodes, links };
}
