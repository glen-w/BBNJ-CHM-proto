import Link from "next/link";

import type { ResearchItem } from "@/lib/contracts/extensions";
import { literatureBrowseHref } from "@/lib/research-lane";
import { openHrefForResearch } from "@/server/research";

const PANEL_LIMIT = 8;

function openAccess(licence: string | undefined): boolean {
  return !!licence && /CC[-\s]?BY|open access/i.test(licence);
}

/**
 * Related-research list — title + meta rows with the same separators as treaty cites.
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
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Related research
        {items.length > 0 ? (
          <span className="ms-2 font-normal normal-case tracking-normal text-muted-foreground">({items.length})</span>
        ) : null}
      </summary>
      <div className="mt-3">
        <div className="mb-3 flex justify-end">
          <Link href={href} className="text-xs underline underline-offset-2 hover:text-institutional">
            Library
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No linked research for this record.</p>
        ) : (
          <ul className="space-y-3" aria-label="Related research">
            {shown.map((item) => {
              const open = openHrefForResearch(item);
              return (
                <li key={item.id} className="border-b border-line/70 pb-3 last:border-0 last:pb-0">
                  <div className="text-sm font-medium leading-snug text-foreground">{item.title}</div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {item.citation ? <span>{item.citation}</span> : null}
                    {item.year && !item.citation ? <span>{item.year}</span> : null}
                    {openAccess(item.licence) ? (
                      <span className="rounded border border-line bg-muted px-1 text-[10px] uppercase tracking-wide">
                        OA
                      </span>
                    ) : null}
                    {open ? (
                      <a href={open} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                        Open
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {more > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <Link href={href} className="underline underline-offset-2 hover:text-institutional">
              {more} more in the library
            </Link>
          </p>
        ) : null}
      </div>
    </details>
  );
}
