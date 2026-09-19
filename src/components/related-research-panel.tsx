import Link from "next/link";

import type { ResearchItem } from "@/lib/contracts/extensions";
import { literatureBrowseHref } from "@/lib/research-lane";
import { openHrefForResearch } from "@/server/research";

const PANEL_LIMIT = 8;

function openAccess(licence: string | undefined): boolean {
  return !!licence && /CC[-\s]?BY|open access/i.test(licence);
}

/**
 * Compact related-research list — same density as treaty-cite / artefact chips.
 * Caller must omit this component entirely when the research lane gate is off.
 */
export function RelatedResearchPanel({
  items,
  browseHref,
}: {
  items: ResearchItem[];
  browseHref?: string;
}) {
  const href = browseHref ?? literatureBrowseHref();
  const shown = items.slice(0, PANEL_LIMIT);
  const more = items.length - shown.length;
  return (
    <section className="rounded-lg border p-4" aria-labelledby="related-research-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="related-research-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Related research
        </h2>
        <Link href={href} className="text-xs underline underline-offset-2 hover:text-institutional">
          Literature
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No linked research for this record ·{" "}
          <button
            type="button"
            disabled
            className="underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            title="Suggest a paper is not in this build"
          >
            Suggest a paper
          </button>
          .
        </p>
      ) : (
        <ul className="space-y-1.5" aria-label="Related research">
          {shown.map((item) => {
            const open = openHrefForResearch(item);
            return (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                <span className="font-medium text-foreground">{item.title}</span>
                {item.citation ? <span className="text-muted-foreground">{item.citation}</span> : null}
                {item.year && !item.citation ? <span className="text-muted-foreground">{item.year}</span> : null}
                {openAccess(item.licence) ? (
                  <span className="rounded border border-line bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    OA
                  </span>
                ) : null}
                {open ? (
                  <a href={open} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                    Open
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {more > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Link href={href} className="underline underline-offset-2 hover:text-institutional">
            {more} more on the literature desk
          </Link>
        </p>
      ) : null}
    </section>
  );
}
