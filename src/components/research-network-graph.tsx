"use client";

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ResearchGraph, ResearchGraphNode } from "@/lib/research-graph";
import { cn } from "@/lib/utils";

const W = 440;
const H = 360;

type SimNode = ResearchGraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};
type SimLink = { source: SimNode; target: SimNode; weight?: number };

export function ResearchNetworkGraph({ graph, className }: { graph: ResearchGraph; className?: string }) {
  const [layout, setLayout] = useState<SimNode[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0, k: 1 });
  const dragId = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);

  const neighborSet = useMemo(() => {
    if (!focusId) return null;
    const n = new Set<string>([focusId]);
    for (const l of graph.links) {
      if (l.source === focusId) n.add(l.target);
      if (l.target === focusId) n.add(l.source);
    }
    return n;
  }, [focusId, graph.links]);

  useEffect(() => {
    const nodes: SimNode[] = graph.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + 80 * Math.cos((2 * Math.PI * i) / Math.max(graph.nodes.length, 1)),
      y: H / 2 + 80 * Math.sin((2 * Math.PI * i) / Math.max(graph.nodes.length, 1)),
    }));
    const linkById = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = graph.links
      .map((l) => {
        const s = linkById.get(l.source);
        const t = linkById.get(l.target);
        if (!s || !t) return null;
        return { source: s, target: t, weight: l.weight };
      })
      .filter(Boolean) as SimLink[];

    nodesRef.current = nodes;
    simRef.current?.stop();
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 36 + 8 / Math.max((l as SimLink & { weight?: number }).weight ?? 1, 1))
          .strength(0.35),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide(10))
      .alpha(0.9)
      .on("tick", () => {
        setLayout(nodes.map((n) => ({ ...n })));
      });

    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [graph.nodes, graph.links]);

  const focusNode = focusId ? layout.find((n) => n.id === focusId) : undefined;
  const layoutById = useMemo(() => new Map(layout.map((n) => [n.id, n])), [layout]);

  if (graph.nodes.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No papers with a place tag to graph. Narrow the list or pick a journey filter.
      </p>
    );
  }

  return (
    <figure className={cn("rounded-lg border bg-muted/20 p-3", className)}>
      <p className="mb-2 text-xs text-muted-foreground">
        Drag nodes · scroll to zoom · hover to highlight neighbours · click to open the source when a link exists.
      </p>
      <div
        className="relative overflow-hidden rounded-md border bg-card"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.92 : 1.08;
          setPan((p) => ({ ...p, k: Math.min(2.5, Math.max(0.35, p.k * delta)) }));
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-lg touch-none select-none"
          role="img"
          aria-label="Interactive literature place network"
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${pan.k})`}>
            {graph.links.map((link, i) => {
              const a = layoutById.get(link.source);
              const b = layoutById.get(link.target);
              if (!a?.x || !b?.x || a.y == null || b.y == null) return null;
              const dim =
                neighborSet && (!neighborSet.has(link.source) || !neighborSet.has(link.target));
              return (
                <line
                  key={`${link.source}-${link.target}-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="stroke-line"
                  strokeWidth={dim ? 0.4 : 1}
                  strokeOpacity={dim ? 0.12 : 0.45}
                />
              );
            })}
            {layout.map((node) => {
              if (node.x == null || node.y == null) return null;
              const dim = neighborSet && !neighborSet.has(node.id);
              const focused = focusId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerEnter={() => setFocusId(node.id)}
                  onPointerLeave={() => {
                    if (dragId.current !== node.id) setFocusId(null);
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragId.current = node.id;
                    const simNode = nodesRef.current.find((n) => n.id === node.id);
                    if (simNode) {
                      simNode.fx = simNode.x;
                      simNode.fy = simNode.y;
                    }
                    simRef.current?.alphaTarget(0.25).restart();
                  }}
                  onPointerMove={(e) => {
                    if (dragId.current !== node.id) return;
                    const simNode = nodesRef.current.find((n) => n.id === node.id);
                    if (!simNode) return;
                    const svg = e.currentTarget.ownerSVGElement;
                    if (!svg) return;
                    const pt = svg.createSVGPoint();
                    pt.x = e.clientX;
                    pt.y = e.clientY;
                    const ctm = svg.getScreenCTM();
                    if (!ctm) return;
                    const p = pt.matrixTransform(ctm.inverse());
                    simNode.fx = (p.x - pan.x) / pan.k;
                    simNode.fy = (p.y - pan.y) / pan.k;
                    simRef.current?.alpha(0.3).restart();
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    if (dragId.current === node.id) {
                      const simNode = nodesRef.current.find((n) => n.id === node.id);
                      if (simNode) {
                        simNode.fx = null;
                        simNode.fy = null;
                      }
                      dragId.current = null;
                      simRef.current?.alphaTarget(0);
                    }
                  }}
                  onClick={() => {
                    if (node.href) window.open(node.href, "_blank", "noopener,noreferrer");
                  }}
                >
                  <circle
                    r={focused ? 6 : 4.5}
                    className={cn(
                      focused ? "fill-institutional" : "fill-institutional/75",
                      dim && "opacity-25",
                    )}
                  />
                </g>
              );
            })}
          </g>
        </svg>
        {focusNode ? (
          <div className="absolute bottom-0 left-0 right-0 border-t bg-card/95 px-2 py-1.5 text-xs">
            <div className="font-medium text-foreground">{focusNode.label}</div>
            {focusNode.hint ? <div className="text-muted-foreground">{focusNode.hint}</div> : null}
            {focusNode.href ? (
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Click node to open source</div>
            ) : null}
          </div>
        ) : null}
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Place network: an edge means two papers share at least one seeded ABNJ place keyword (not a citation graph).{" "}
        {graph.nodes.length} papers, {graph.links.length} links
        {graph.omittedNoPlace > 0 ? ` · ${graph.omittedNoPlace} without a place tag omitted` : ""}.
        {graph.links.length === 0 ? " Try filtering by place on the list above." : ""}
      </figcaption>
    </figure>
  );
}
