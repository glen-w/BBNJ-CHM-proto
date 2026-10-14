"use client";

import { useMemo } from "react";

import type { ResearchGraph } from "@/lib/research-graph";
import { cn } from "@/lib/utils";

const SIZE = 420;

function layoutCircle(nodes: ResearchGraph["nodes"]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE * 0.38;
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    pos.set(node.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  });
  return pos;
}

export function ResearchNetworkGraph({ graph, className }: { graph: ResearchGraph; className?: string }) {
  const positions = useMemo(() => layoutCircle(graph.nodes), [graph.nodes]);

  if (graph.nodes.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No papers to graph.</p>;
  }

  return (
    <figure className={cn("rounded-lg border bg-muted/20 p-3", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-md" role="img" aria-label="Literature facet network">
        {graph.links.map((link, i) => {
          const a = positions.get(link.source);
          const b = positions.get(link.target);
          if (!a || !b) return null;
          return (
            <line
              key={`${link.source}-${link.target}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-line"
              strokeWidth="0.6"
              strokeOpacity={0.5}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const p = positions.get(node.id)!;
          return (
            <g key={node.id}>
              <circle cx={p.x} cy={p.y} r={4} className="fill-institutional/80" />
              <title>{node.label}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Snapshot graph: edges when two papers share a journey tag, place keyword, or IFB. Not a live bibliographic service. Showing{" "}
        {graph.nodes.length} papers, {graph.links.length} links.
      </figcaption>
    </figure>
  );
}
