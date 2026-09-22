import Link from "next/link";

import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { DomainBadge } from "@/components/chips";
import { FilterEmpty, ListFilter } from "@/components/list-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AbnjBox, Domain } from "@/lib/contracts/events";
import { DOMAIN_LABEL } from "@/lib/format";
import { literatureBrowseHref } from "@/lib/research-lane";
import { cn } from "@/lib/utils";
import { getDb } from "@/lib/db";
import { isResearchLaneEnabled, listPublishedResearch, openHrefForResearch } from "@/server/research";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PILLARS = ["mgr", "eia", "cbtmt", "abmt"] as const;

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function openAccess(licence: string | undefined): boolean {
  return !!licence && /CC[-\s]?BY|open access/i.test(licence);
}

export default async function LiteraturePage({ searchParams }: Props) {
  const q = await searchParams;
  const pillarParsed = Domain.safeParse(one(q.pillar));
  const boxParsed = AbnjBox.safeParse(one(q.box));
  const pillar = pillarParsed.success ? pillarParsed.data : undefined;
  const box = boxParsed.success ? boxParsed.data : undefined;
  const db = getDb();
  const laneOn = isResearchLaneEnabled(db);

  if (!laneOn) {
    return (
      <AppShell title="Library">
        <p className="max-w-2xl text-sm text-muted-foreground">
          The library is hidden.{" "}
          <Link href="/settings?tab=desk" className="underline underline-offset-2 hover:text-institutional">
            Settings
          </Link>{" "}
          can show it again.
        </p>
      </AppShell>
    );
  }

  const items = listPublishedResearch(db).filter((item) => {
    if (pillar && !item.pillars.includes(pillar)) return false;
    if (box && !item.geographies.includes(box)) return false;
    return true;
  });

  return (
    <AppShell title="Library">
      <p className="max-w-3xl text-sm text-muted-foreground">
        A library of open-access research and resources for the Agreement. The Clearing House keeps the citation and a link to the source.
      </p>
      <nav aria-label="Literature by journey" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link
          href={literatureBrowseHref(undefined, box)}
          className={cn("underline-offset-2 hover:underline", !pillar && "font-medium text-foreground")}
          aria-current={!pillar ? "page" : undefined}
        >
          All
        </Link>
        {PILLARS.map((id) => (
          <Link
            key={id}
            href={literatureBrowseHref(id, box)}
            className={cn("underline-offset-2 hover:underline", pillar === id && "font-medium text-foreground")}
            aria-current={pillar === id ? "page" : undefined}
          >
            {DOMAIN_LABEL[id]}
          </Link>
        ))}
      </nav>
      {box ? (
        <p className="text-sm text-muted-foreground">
          Place <strong className="font-medium text-foreground">{box}</strong>
          {" · "}
          <Link href={literatureBrowseHref(pillar)} className="underline underline-offset-2 hover:text-institutional">
            Clear place
          </Link>
        </p>
      ) : null}
      <ListFilter label="Filter this list" placeholder="Title, author, year…">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "paper" : "papers"}
          {pillar ? ` tagged ${DOMAIN_LABEL[pillar]}` : ""}
          {box ? ` mentioning ${box}` : ""}.
        </p>
        <div className="max-h-[min(70vh,42rem)] overflow-auto rounded-lg border bg-card">
          <Table containerClassName="overflow-visible">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)]">
              <TableRow>
                <TableHead>Paper</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Journeys</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow data-empty="true">
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No papers match.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const href = openHrefForResearch(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xl whitespace-normal">
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.citation ?? "Citation not recorded"}
                        </div>
                      </TableCell>
                      <TableCell className="w-16 tabular-nums text-xs">{item.year ?? "—"}</TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {item.pillars.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                          {item.pillars.map((d) => (
                            <DomainBadge key={d} domain={d} />
                          ))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {openAccess(item.licence) ? (
                          <span className="me-2 rounded border border-line bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            OA
                          </span>
                        ) : null}
                        {href ? (
                          <a href={href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                            Open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <FilterEmpty />
      </ListFilter>
      <AboutPanel title="About this list">
        <p>
          Each entry is a citation, a year and a link to the source. The Clearing House does not store the file.
        </p>
        <p>
          <strong className="font-medium text-foreground">Related research</strong> on an MGR, EIA or ABMT record lists papers that share that
          journey and that area. If there is no shared place, the record says “No linked research”. A paper is tied to a place when its title or
          abstract names that area.
        </p>
        <p>These are reference materials, not Party filings.</p>
      </AboutPanel>
    </AppShell>
  );
}
