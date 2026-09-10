import Link from "next/link";

import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, ProvenanceBadge, StatusChip } from "@/components/chips";
import { DeskMenu, DeskMenuItem } from "@/components/desk-menu";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { FilterEmpty, ListFilter } from "@/components/list-filter";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { can } from "@/server/policy";
import { listEiaActivities } from "@/server/queries";
import { SEED_HONESTY, provenanceBadgeForRecord } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EiaPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const activities = listEiaActivities(db, p);

  return (
    <AppShell title="EIA — Part IV" flash={flash}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {can(p, "submit") ? (
          <Link href="/eia/new" className={cn(buttonVariants({ size: "sm" }))}>
            New
          </Link>
        ) : null}
        <DeskMenu label="Import">
          <DeskMenuItem href="/api/template/eia-screening.xlsx" title="Offline screening template (Meta · Data · Field guide)">
            Download template (.xlsx)
          </DeskMenuItem>
          {can(p, "import") ? (
            <DeskMenuItem href="/eia/import" title="Offline screening template → import (Secretariat)">
              Import screening .xlsx
            </DeskMenuItem>
          ) : null}
        </DeskMenu>
        <ExportLinks domain="eia" />
        {can(p, "comment_stb") ? (
          <Link href="/stb" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            STB review queue
          </Link>
        ) : null}
      </div>

      <ListFilter label="Filter EIA records" placeholder="Title, party, ABNJ box, public id…">
        <div className="max-h-[min(70vh,42rem)] overflow-auto rounded-lg border bg-card">
          <Table containerClassName="overflow-visible">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)]">
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="min-w-[4.5rem]">Party</TableHead>
                <TableHead>ABNJ box</TableHead>
                <TableHead>Latest stage</TableHead>
                <TableHead>Latest pack</TableHead>
                <TableHead>Public record id</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">
                  <span className="block">Updated</span>
                  <span className="block text-[0.65rem] font-normal normal-case tracking-normal text-muted-foreground">
                    newest first
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow data-empty="true">
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No activities visible to your role.
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="min-w-[16rem] max-w-sm whitespace-normal">
                      <Link href={`/eia/${a.id}`} className="font-medium hover:underline">
                        {a.title}
                      </Link>
                      {(() => {
                        const badge = provenanceBadgeForRecord(db, a.id);
                        return badge ? (
                          <div className="mt-1">
                            <ProvenanceBadge badge={badge} />
                          </div>
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell className="min-w-[4.5rem] whitespace-nowrap font-mono text-xs">{a.partyCode}</TableCell>
                    <TableCell className="max-w-[10rem] whitespace-normal text-xs">{a.abnjBox}</TableCell>
                    <TableCell className="whitespace-normal text-xs">{stageLabel(a.currentStage)}</TableCell>
                    <TableCell>{a.latestPackStatus ? <StatusChip status={a.latestPackStatus} /> : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.publicRecordId ?? <span className="italic text-muted-foreground">unpublished</span>}</TableCell>
                    <TableCell>
                      <ConfidentialityBadge tier={a.confidentiality} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-xs">{fmtDate(a.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <FilterEmpty />
      </ListFilter>

      <AboutPanel title="About this workflow">
        <p>
          Each activity is one record carrying many <strong className="text-foreground">packs</strong> (screening, notices, draft EIA, STB comments,
          decision, monitoring). Pack status is <em>draft → pending → published</em>; the record only caches the latest stage. Published draft EIAs
          feed the STB queue.
        </p>
        <p>{SEED_HONESTY}</p>
      </AboutPanel>
    </AppShell>
  );
}
