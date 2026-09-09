import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DomainBadge } from "@/components/chips";
import { flashFrom } from "@/components/flash";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Domain } from "@/lib/contracts/events";
import { getDb } from "@/lib/db";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { searchRecords } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const DOMAINS: { value: Domain | ""; label: string }[] = [
  { value: "", label: "All domains" },
  { value: "mgr", label: "MGR" },
  { value: "eia", label: "EIA" },
  { value: "cbtmt", label: "CBTMT" },
  { value: "abmt", label: "ABMT" },
];

export default async function SearchPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const domainRaw = typeof sp.domain === "string" ? sp.domain : "";
  const domain = DOMAINS.some((d) => d.value === domainRaw && d.value !== "") ? (domainRaw as Domain) : undefined;
  const p = await getSessionUser();
  const hits = q.trim() ? searchRecords(getDb(), p, { q, domain }) : [];

  const byDomain = {
    mgr: hits.filter((h) => h.domain === "mgr"),
    eia: hits.filter((h) => h.domain === "eia"),
    cbtmt: hits.filter((h) => h.domain === "cbtmt"),
    abmt: hits.filter((h) => h.domain === "abmt"),
  };

  return (
    <AppShell title="Search" flash={flash}>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Full-text search across MGR, EIA, CBTMT and ABMT records you are allowed to see. Visibility follows the same
        confidentiality and role rules as every list page — drafts and restricted rows never leak to public readers.
      </p>

      <form className="flex flex-wrap items-end gap-2" method="get" role="search">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Query</span>
          <Input name="q" type="search" placeholder="Title, area, B-SBI, public id, themes…" defaultValue={q} className="w-72" autoFocus />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Domain</span>
          <select
            name="domain"
            defaultValue={domain ?? ""}
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DOMAINS.map((d) => (
              <option key={d.value || "all"} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "secondary" }))}>
          Search
        </button>
      </form>

      {!q.trim() ? (
        <p className="text-sm text-muted-foreground">Enter a query to search indexed record fields.</p>
      ) : hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No visible records match “{q}”.</p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”
            {domain ? ` in ${domain.toUpperCase()}` : ""}.
          </p>
          {(["mgr", "eia", "cbtmt", "abmt"] as const).map((d) => {
            const rows = byDomain[d];
            if (rows.length === 0) return null;
            return (
              <section key={d} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  <DomainBadge domain={d} />
                  <span>
                    {d.toUpperCase()} ({rows.length})
                  </span>
                </h2>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Public record id</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((h) => (
                        <TableRow key={`${h.domain}-${h.id}`}>
                          <TableCell>
                            <Link href={h.href} className="font-medium hover:underline">
                              {h.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{h.subtitle ?? "—"}</TableCell>
                          <TableCell>{stageLabel(h.stage)}</TableCell>
                          <TableCell className="font-mono text-xs">{h.publicRecordId ?? "—"}</TableCell>
                          <TableCell>{fmtDate(h.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
