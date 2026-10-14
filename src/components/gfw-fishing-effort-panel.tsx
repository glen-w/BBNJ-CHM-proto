import Image from "next/image";

import { GFW_FISHING_EFFORT_IMAGE } from "@/lib/gfw-overlay";
import { cn } from "@/lib/utils";

/** Illustrative high-seas fishing-effort snapshot — content for a closed-by-default disclosure. */
export function GfwFishingEffortPanel({ className }: { className?: string }) {
  return (
    <figure className={cn("rounded-md border bg-muted/20 p-2", className)}>
      <Image
        src={GFW_FISHING_EFFORT_IMAGE}
        alt="Illustrative Global Fishing Watch apparent fishing effort on an unlabelled high-seas patch"
        width={960}
        height={540}
        className="mx-auto h-auto w-full max-w-lg rounded-sm"
      />
      <figcaption className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>
          Illustrative apparent fishing effort (AIS) on an unlabelled high-seas patch — not operational GIS, not a Party
          position, and not tied to this stub&apos;s coordinates.
        </p>
        <p>
          Source pattern:{" "}
          <a href="https://globalfishingwatch.org/map/" className="underline hover:text-foreground" rel="noreferrer" target="_blank">
            Global Fishing Watch
          </a>{" "}
          public fishing-effort tiles (demo crop).
        </p>
      </figcaption>
    </figure>
  );
}
