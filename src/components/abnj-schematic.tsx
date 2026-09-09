import Link from "next/link";

import { ABNJ_SCHEMATIC_NODES } from "@/lib/abnj-schematic";
import type { AbnjBox } from "@/lib/contracts/events";
import { cn } from "@/lib/utils";

export type NeighbourPin = {
  id: string;
  title: string;
  href: string;
};

export function AbnjSchematic({
  currentBox,
  neighbours,
  className,
}: {
  currentBox: AbnjBox;
  neighbours: NeighbourPin[];
  className?: string;
}) {
  const inBox = neighbours.filter((n) => true);

  return (
    <figure className={cn("rounded-lg border bg-muted/30 p-3", className)}>
      <svg viewBox="0 0 100 80" className="mx-auto w-full max-w-md" role="img" aria-label={`Schematic of demo ABNJ boxes; current box ${currentBox}`}>
        <rect x="0" y="0" width="100" height="80" fill="transparent" />
        <path
          d="M 8 42 Q 28 18 50 22 Q 72 26 92 38 Q 88 58 72 72 Q 48 78 22 68 Q 8 58 8 42 Z"
          className="fill-none stroke-line stroke-[0.4]"
          strokeDasharray="2 1"
        />
        <text x="50" y="8" textAnchor="middle" className="fill-muted-foreground text-[3px]">
          North Atlantic (schematic)
        </text>
        {ABNJ_SCHEMATIC_NODES.map((node) => {
          const isCurrent = node.box === currentBox;
          const hasNeighbour = inBox.length > 0 && isCurrent;
          return (
            <g key={node.box}>
              <circle
                cx={node.x}
                cy={node.y}
                r={isCurrent ? 4.2 : 2.8}
                className={cn(
                  isCurrent ? "fill-institutional stroke-institutional" : "fill-card stroke-line",
                  hasNeighbour && isCurrent && "stroke-[0.6]",
                )}
                strokeWidth={isCurrent ? 0.8 : 0.4}
              />
              <text
                x={node.x}
                y={node.y + (isCurrent ? 7.5 : 6)}
                textAnchor="middle"
                className={cn("text-[2.6px]", isCurrent ? "fill-institutional font-semibold" : "fill-muted-foreground")}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Schematic of the demo ABNJ vocabulary — not a chart, not GIS. The box is the only spatial key in this build.
      </figcaption>
      {inBox.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {inBox.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className="rounded border border-institutional/30 bg-institutional/5 px-2 py-0.5 hover:underline">
                {n.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
