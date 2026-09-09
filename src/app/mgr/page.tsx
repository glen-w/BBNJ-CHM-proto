import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge } from "@/components/chips";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { can } from "@/server/policy";
import { listMgrBatches } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MgrPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const p = await getSessionUser();
  const db = getDb();
  const batches = listMgrBatches(db, p, q || undefined);

  return (
    <AppShell title="Marine genetic resources (MGR) — Part II" flash={flash}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pre-collection notification (Art 12.2) → valid receipt issues the <strong>B-SBI</strong> → Secretariat publishes the pack →{" "}
          <strong>publicRecordId</strong> → bell and audit. Post-collection and utilisation packs attach to the same batch.
        </p>
        <div className="flex flex-wrap gap-2">
          {can(p, "submit") ? (
            <Link href="/mgr/new" className={cn(buttonVariants({ size: "sm" }))}>
              New pre-collection notification
            </Link>
          ) : null}
          <a href="/api/template/mgr.xlsx" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="Offline Excel template generated from FIELD_DEFS (Meta · Data · Field guide)">
            Download offline template (.xlsx)
          </a>
          {can(p, "import") ? (
            <Link href="/mgr/import" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Import offline template
            </Link>
          ) : null}
          <ExportLinks domain="mgr" />
        </div>
      </div>

      <form className="flex gap-2" method="get">
        <Input name="q" placeholder="Search title, area, B-SBI, public id…" defaultValue={q} className="max-w-sm" />
        <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "default" }))}>
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>B-SBI</TableHead>
              <TableHead>Public record id</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No batches visible to your role.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/mgr/${b.id}`} className="font-medium hover:underline">
                      {b.title}
                    </Link>
                    {b.locationHint ? <div className="text-xs text-muted-foreground">{b.locationHint}</div> : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.partyCode}</TableCell>
                  <TableCell className="text-xs">{stageLabel(b.currentStage)}</TableCell>
                  <TableCell className="font-mono text-xs">{b.bSbi ?? <span className="italic text-muted-foreground">not issued</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{b.publicRecordId ?? <span className="italic text-muted-foreground">unpublished</span>}</TableCell>
                  <TableCell>
                    <ChannelBadge channel={b.sourceChannel} />
                  </TableCell>
                  <TableCell>
                    <ConfidentialityBadge tier={b.confidentiality} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(b.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
