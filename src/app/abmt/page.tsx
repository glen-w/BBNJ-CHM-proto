import Link from "next/link";

import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, DomainBadge, ProvenanceBadge, StatusChip } from "@/components/chips";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { FilterEmpty, ListFilter } from "@/components/list-filter";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WithoutPrejudiceBanner } from "@/components/without-prejudice";
import { getDb } from "@/lib/db";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { can } from "@/server/policy";
import { listAbmtProposals } from "@/server/queries";
import { SEED_HONESTY, provenanceBadgeForRecord } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AbmtPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const proposals = listAbmtProposals(db, p);

  return (
    <AppShell title="ABMT — Part III" flash={flash}>
      <WithoutPrejudiceBanner />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {can(p, "submit", { domain: "abmt" }) ? (
          <Link href="/abmt/new" className={cn(buttonVariants({ size: "sm" }))}>
            New
          </Link>
        ) : null}
        <ExportLinks domain="abmt" />
      </div>
      <ListFilter label="Filter ABMT records" placeholder="Title, party, public id…">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Latest pack</TableHead>
                <TableHead>Public record id</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 ? (
                <TableRow data-empty="true">
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No proposals visible to your role.
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-sm whitespace-normal">
                      <Link href={`/abmt/${a.id}`} className="inline-flex flex-wrap items-center gap-2 font-medium hover:underline">
                        <DomainBadge domain="abmt" withIcon />
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
                    <TableCell className="w-16 whitespace-nowrap font-mono text-xs">{a.partyCode}</TableCell>
                    <TableCell className="text-xs">{stageLabel(a.currentStage)}</TableCell>
                    <TableCell>{a.latestPackStatus ? <StatusChip status={a.latestPackStatus} /> : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.publicRecordId ?? <span className="italic text-muted-foreground">unpublished</span>}</TableCell>
                    <TableCell>
                      <ConfidentialityBadge tier={a.confidentiality} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-xs">{fmtDate(a.updatedAt)}</TableCell>
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
          Proposals under Art 51.3(a)(ii) ride the same rails as every other journey: one record, a <code>proposal_stub</code> pack that moves{" "}
          <em>draft → pending → published</em>, a receipt when it enters pending, and a <code>BBNJ-ABMT-YYYY-NNNNN</code> public record id at first
          publish. No ABMT-specific content model exists in this build — the stage name says so.
        </p>
        <p>{SEED_HONESTY}</p>
      </AboutPanel>
    </AppShell>
  );
}
