"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ResearchGraph, ResearchGraphNode } from "@/lib/research-graph";
import { cn } from "@/lib/utils";

const W = 440;
const H = 360;
const PAD = 28;
const MIN_K = 0.15;
const MAX_K = 2.5;

type SimNode = ResearchGraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};
type SimLink = { source: SimNode; target: SimNode; weight?: number };
type Pan = { x: number; y: number; k: number };

function fitPan(nodes: SimNode[]): Pan {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.x == null || n.y == null) continue;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, k: 1 };
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const k = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh, 1.25);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    k: Math.max(MIN_K, Math.min(MAX_K, k)),
    x: W / 2 - cx * k,
    y: H / 2 - cy * k,
  };
}

type ClusterLabel = { hubId: string; place: string };

/** Highest-degree node in each connected component (≥2 papers), labelled by dominant place. */
function clusterLabelsFor(graph: ResearchGraph): ClusterLabel[] {
  const adj = new Map<string, string[]>();
  const degree = new Map<string, number>();
  for (const n of graph.nodes) {
    adj.set(n.id, []);
    degree.set(n.id, 0);
  }
  for (const l of graph.links) {
    adj.get(l.source)?.push(l.target);
    adj.get(l.target)?.push(l.source);
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const labels: ClusterLabel[] = [];

  for (const n of graph.nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n.id];
    const component: string[] = [];
    seen.add(n.id);
    while (stack.length) {
      const id = stack.pop()!;
      component.push(id);
      for (const next of adj.get(id) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    if (component.length < 2) continue;

    let hubId = component[0];
    let hubDeg = -1;
    for (const id of component) {
      const d = degree.get(id) ?? 0;
      if (d > hubDeg) {
        hubDeg = d;
        hubId = id;
      }
    }

    const placeCounts = new Map<string, number>();
    for (const id of component) {
      for (const place of byId.get(id)?.places ?? []) {
        placeCounts.set(place, (placeCounts.get(place) ?? 0) + 1);
      }
    }
    let place = "";
    let best = -1;
    for (const [p, c] of placeCounts) {
      if (c > best) {
        best = c;
        place = p;
      }
    }
    if (place) labels.push({ hubId, place });
  }

  return labels;
}

export function ResearchNetworkGraph({ graph, className }: { graph: ResearchGraph; className?: string }) {
  const [layout, setLayout] = useState<SimNode[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0, k: 1 });
  const dragId = useRef<string | null>(null);
  const panning = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const fittedRef = useRef(false);
  const panRef = useRef(pan);
  panRef.current = pan;

  const neighborSet = useMemo(() => {
    if (!focusId) return null;
    const n = new Set<string>([focusId]);
    for (const l of graph.links) {
      if (l.source === focusId) n.add(l.target);
      if (l.target === focusId) n.add(l.source);
    }
    return n;
  }, [focusId, graph.links]);

  const clusterLabels = useMemo(() => clusterLabelsFor(graph), [graph]);
  const clusterByHub = useMemo(() => new Map(clusterLabels.map((c) => [c.hubId, c.place])), [clusterLabels]);

  useEffect(() => {
    const nodes: SimNode[] = graph.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + 36 * Math.cos((2 * Math.PI * i) / Math.max(graph.nodes.length, 1)),
      y: H / 2 + 36 * Math.sin((2 * Math.PI * i) / Math.max(graph.nodes.length, 1)),
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
    fittedRef.current = false;
    simRef.current?.stop();
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 16 + 3 / Math.max((l as SimLink & { weight?: number }).weight ?? 1, 1))
          .strength(0.7),
      )
      // Cap repulsion range so disconnected clusters don't shove each other off-canvas.
      .force("charge", forceManyBody().strength(-28).distanceMax(100))
      .force("center", forceCenter(W / 2, H / 2))
      .force("x", forceX(W / 2).strength(0.14))
      .force("y", forceY(H / 2).strength(0.14))
      .force("collide", forceCollide(7))
      .alpha(0.9)
      .on("tick", () => {
        setLayout(nodes.map((n) => ({ ...n })));
      })
      .on("end", () => {
        if (fittedRef.current || dragId.current) return;
        fittedRef.current = true;
        setPan(fitPan(nodes));
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
        Drag background to pan · drag nodes · scroll to zoom · hover to highlight neighbours · open the source from the
        info pane when a link exists.
      </p>
      <div
        className="relative overflow-hidden rounded-md border bg-card"
        onPointerLeave={() => {
          if (!dragId.current && !panning.current) setFocusId(null);
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          setPan((p) => {
            const nextK = Math.min(MAX_K, Math.max(MIN_K, p.k * delta));
            // Zoom toward view center so clusters stay framed while zooming out.
            const cx = W / 2;
            const cy = H / 2;
            const worldX = (cx - p.x) / p.k;
            const worldY = (cy - p.y) / p.k;
            return {
              k: nextK,
              x: cx - worldX * nextK,
              y: cy - worldY * nextK,
            };
          });
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-lg touch-none select-none cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Interactive literature place network"
          onPointerDown={(e) => {
            if (dragId.current) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            panning.current = {
              pointerId: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              panX: panRef.current.x,
              panY: panRef.current.y,
            };
          }}
          onPointerMove={(e) => {
            const panDrag = panning.current;
            if (!panDrag || panDrag.pointerId !== e.pointerId) return;
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const sx = W / rect.width;
            const sy = H / rect.height;
            setPan((p) => ({
              ...p,
              x: panDrag.panX + (e.clientX - panDrag.x) * sx,
              y: panDrag.panY + (e.clientY - panDrag.y) * sy,
            }));
          }}
          onPointerUp={(e) => {
            if (panning.current?.pointerId === e.pointerId) {
              panning.current = null;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* already released */
              }
            }
          }}
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
              const isHub = clusterByHub.has(node.id);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerEnter={() => setFocusId(node.id)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragId.current = node.id;
                    setFocusId(node.id);
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
                    const { x, y, k } = panRef.current;
                    simNode.fx = (p.x - x) / k;
                    simNode.fy = (p.y - y) / k;
                    simRef.current?.alpha(0.3).restart();
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
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
                >
                  <circle
                    r={focused ? 6.5 : isHub ? 5.5 : 4.5}
                    className={cn(
                      focused || isHub ? "fill-institutional" : "fill-institutional/75",
                      dim && "opacity-25",
                    )}
                  />
                </g>
              );
            })}
            {clusterLabels.map((cluster) => {
              const hub = layoutById.get(cluster.hubId);
              if (hub?.x == null || hub.y == null) return null;
              const dim = neighborSet && !neighborSet.has(cluster.hubId);
              return (
                <text
                  key={`cluster-${cluster.hubId}`}
                  x={hub.x}
                  y={hub.y - 10}
                  textAnchor="middle"
                  className={cn(
                    "fill-foreground pointer-events-none select-none",
                    dim && "opacity-25",
                  )}
                  style={{ fontSize: 9, fontWeight: 600 }}
                  paintOrder="stroke"
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  {cluster.place}
                </text>
              );
            })}
          </g>
        </svg>
        {focusNode ? (
          <div className="absolute bottom-0 left-0 right-0 border-t bg-card/95 px-2 py-1.5 text-xs">
            <div className="font-medium text-foreground">{focusNode.label}</div>
            {focusNode.hint ? <div className="text-muted-foreground">{focusNode.hint}</div> : null}
            {focusNode.href ? (
              <a
                href={focusNode.href}
                rel="noopener noreferrer"
                target="_blank"
                className="mt-0.5 inline-block underline underline-offset-2 hover:text-institutional"
              >
                Open source
              </a>
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
