import Image from "next/image";

import { ISA_CCZ_MAP_IMAGE } from "@/lib/isa-overlay";
import { cn } from "@/lib/utils";

/** Illustrative ISA Clarion-Clipperton Zone exploration / reserved-areas map — closed-by-default disclosure content. */
export function IsaCczMapPanel({ className }: { className?: string }) {
  return (
    <figure className={cn("rounded-md border bg-muted/20 p-2", className)}>
      <Image
        src={ISA_CCZ_MAP_IMAGE}
        alt="International Seabed Authority map of Clarion-Clipperton Fracture Zone exploration and reserved areas for polymetallic nodules"
        width={1400}
        height={990}
        className="mx-auto h-auto w-full max-w-2xl rounded-sm"
      />
      <figcaption className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>
          Illustrative ISA Clarion-Clipperton Zone exploration and reserved areas map — not operational GIS, not a Party
          position, and without prejudice to ISA processes under UNCLOS.
        </p>
        <p>
          Source:{" "}
          <a
            href="https://isa.org.jm/maps/clarion-clipperton-zone/"
            className="underline hover:text-foreground"
            rel="noreferrer"
            target="_blank"
          >
            International Seabed Authority
          </a>{" "}
          (demo crop of published map sheet 0090).
        </p>
      </figcaption>
    </figure>
  );
}
