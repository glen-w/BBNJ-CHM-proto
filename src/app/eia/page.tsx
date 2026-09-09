import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, ProvenanceBadge, StatusChip } from "@/components/chips";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { can } from "@/server/policy";
import { listEiaActivities } from "@/server/queries";
import { SEED_HONESTY, provenanceBadgeForTitle } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EiaPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const p = await getSessionUser();
  const activities = listEiaActivities(getDb(), p, q || undefined);

  return (
    <AppShell title="Environmental impact assessments (EIA) — Part IV" flash={flash}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each activity is one record carrying many <strong>packs</strong> (screening, notices, draft EIA, STB comments, decision, monitoring). Pack
          status is <em>draft → pending → published</em>; the record only caches the latest stage. Published draft EIAs feed the STB queue.
        </p>
        <p className="w-full text-xs text-muted-foreground">{SEED_HONESTY}</p>
        <div className="flex gap-2">
          {can(p, "submit") ? (
            <Link href="/eia/new" className={cn(buttonVariants({ size: "sm" }))}>
              New activity
            </Link>
          ) : null}
          {can(p, "import") ? (
            <Link href="/eia/import" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="Offline screening template → import (Secretariat)">
              Import screening .xlsx
            </Link>
          ) : null}
          {can(p, "comment_stb") ? (
            <Link href="/stb" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              STB review queue
            </Link>
          ) : null}
          <ExportLinks domain="eia" />
        </div>
      </div>
      <form className="flex gap-2" method="get">
        <Input name="q" placeholder="Search title, ABNJ box, public id…" defaultValue={q} className="max-w-sm" />
        <button type="submit" className={cn(buttonVariants({ variant: "secondary" }))}>
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>ABNJ box</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Latest stage</TableHead>
              <TableHead>Latest pack</TableHead>
              <TableHead>Public record id</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No activities visible to your role.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/eia/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    {(() => {
                      const badge = provenanceBadgeForTitle(a.title);
                      return badge ? (
                        <div className="mt-1">
                          <ProvenanceBadge badge={badge} />
                        </div>
                      ) : null;
                    })()}
                  </TableCell>
                  <TableCell className="text-xs">{a.abnjBox}</TableCell>
                  <TableCell className="font-mono text-xs">{a.partyCode}</TableCell>
                  <TableCell className="text-xs">{stageLabel(a.currentStage)}</TableCell>
                  <TableCell>{a.latestPackStatus ? <StatusChip status={a.latestPackStatus} /> : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{a.publicRecordId ?? <span className="italic text-muted-foreground">unpublished</span>}</TableCell>
                  <TableCell>
                    <ConfidentialityBadge tier={a.confidentiality} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(a.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
