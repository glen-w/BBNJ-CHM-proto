import Link from "next/link";

import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge, ProvenanceBadge } from "@/components/chips";
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
import { listMgrBatches } from "@/server/queries";
import { SEED_HONESTY, provenanceBadgeForRecord } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MgrPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const batches = listMgrBatches(db, p);

  return (
    <AppShell title="MGR — Part II" flash={flash}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {can(p, "submit") ? (
          <Link href="/mgr/new" className={cn(buttonVariants({ size: "sm" }))}>
            New
          </Link>
        ) : null}
        <DeskMenu label="Import">
          <DeskMenuItem href="/api/template/mgr.xlsx" title="Offline Excel template (Meta · Data · Field guide)">
            Download template (.xlsx)
          </DeskMenuItem>
          {can(p, "import") ? (
            <DeskMenuItem href="/mgr/import">Import offline template</DeskMenuItem>
          ) : null}
        </DeskMenu>
        <ExportLinks domain="mgr" />
      </div>

      <ListFilter label="Filter MGR records" placeholder="Title, party, B-SBI, public id…">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>B-SBI</TableHead>
                <TableHead>Public record id</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow data-empty="true">
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No batches visible to your role.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="min-w-[16rem] whitespace-normal">
                      <Link href={`/mgr/${b.id}`} className="font-medium hover:underline">
                        {b.title}
                      </Link>
                      {(() => {
                        const badge = provenanceBadgeForRecord(db, b.id);
                        return badge ? (
                          <div className="mt-1">
                            <ProvenanceBadge badge={badge} />
                          </div>
                        ) : null;
                      })()}
                      {b.locationHint ? <div className="text-xs text-muted-foreground">{b.locationHint}</div> : null}
                    </TableCell>
                    <TableCell className="w-16 font-mono text-xs">{b.partyCode}</TableCell>
                    <TableCell className="text-xs">{stageLabel(b.currentStage)}</TableCell>
                    <TableCell className="font-mono text-xs">{b.bSbi ?? <span className="italic text-muted-foreground">not issued</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{b.publicRecordId ?? <span className="italic text-muted-foreground">unpublished</span>}</TableCell>
                    <TableCell>
                      <ChannelBadge channel={b.sourceChannel} />
                    </TableCell>
                    <TableCell>
                      <ConfidentialityBadge tier={b.confidentiality} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-xs">{fmtDate(b.updatedAt)}</TableCell>
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
          Pre-collection notification (Art 12.2) → valid receipt issues the <strong className="text-foreground">B-SBI</strong> → Secretariat publishes
          the pack → <strong className="text-foreground">publicRecordId</strong> → bell and audit. Post-collection and utilisation packs attach to the
          same batch.
        </p>
        <p>{SEED_HONESTY}</p>
      </AboutPanel>
    </AppShell>
  );
}
