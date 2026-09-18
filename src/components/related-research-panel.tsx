import type { ResearchItem } from "@/lib/contracts/extensions";
import { openHrefForResearch } from "@/server/research";

/**
 * Compact related-research list — same density as treaty-cite / artefact chips.
 * Caller must omit this component entirely when the research lane gate is off.
 */
export function RelatedResearchPanel({ items }: { items: ResearchItem[] }) {
  return (
    <section className="rounded-lg border p-4" aria-labelledby="related-research-heading">
      <h2 id="related-research-heading" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Related research
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No linked research yet ·{" "}
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
          {items.map((item) => {
            const href = openHrefForResearch(item);
            return (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                <span className="font-medium text-foreground">{item.title}</span>
                {item.year ? <span className="text-muted-foreground">{item.year}</span> : null}
                {item.oaUrl ? (
                  <span className="rounded border border-line bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    OA
                  </span>
                ) : null}
                {href ? (
                  <a href={href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                    Open
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
