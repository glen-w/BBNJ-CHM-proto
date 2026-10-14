"use client";

import { useState } from "react";

import type { VmeFeature } from "@/lib/rfmo-vme";
import { boundsOfFeatures, ringToSvgPoints } from "@/lib/rfmo-vme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const W = 360;
const H = 200;

export function VmeClosureMap({
  abnjBox,
  features,
  className,
}: {
  abnjBox: string;
  features: VmeFeature[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (features.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No illustrative RFMO closure layer is bundled for <strong className="font-medium text-foreground">{abnjBox}</strong> in this demo.
      </p>
    );
  }

  const bounds = boundsOfFeatures(features)!;

  return (
    <div className={cn("space-y-2", className)}>
      {!open ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Show illustrative RFMO measures
        </Button>
      ) : (
        <>
          <figure className="rounded-md border bg-muted/20 p-2">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="mx-auto w-full max-w-lg"
              role="img"
              aria-label={`Illustrative RFMO VME closures near ${abnjBox}`}
            >
              <rect x="0" y="0" width={W} height={H} className="fill-card stroke-line" strokeWidth="0.5" />
              {features.map((f) => {
                const outer = f.rings[0];
                if (!outer) return null;
                const pts = ringToSvgPoints(outer, bounds, W, H);
                return (
                  <g key={f.layerId}>
                    <polygon points={pts} className="fill-institutional/15 stroke-institutional/60" strokeWidth="1" />
                    <title>{f.label}</title>
                  </g>
                );
              })}
            </svg>
            <figcaption className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>Illustrative RFMO VME / bottom-fishing closures — not operational GIS, not Party positions.</p>
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
                {features.map((f) => (
                  <li key={f.layerId}>
                    <span className="font-medium text-foreground">{f.rfmo}</span>
                    <span className="text-muted-foreground"> · {f.label}</span>
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen(false)}>
            Hide map
          </Button>
        </>
      )}
    </div>
  );
}
