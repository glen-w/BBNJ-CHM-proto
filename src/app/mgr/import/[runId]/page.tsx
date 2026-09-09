import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { FIELD_DEFS } from "@/lib/mgr-fields";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DomainError } from "@/server/errors";
import { getImportRun } from "@/server/import";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ runId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ImportRunPage({ params, searchParams }: Props) {
  const { runId } = await params;
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  let run;
  try {
    run = getImportRun(getDb(), p, runId);
  } catch (e) {
    if (e instanceof DomainError && e.code === "forbidden") {
      return (
        <AppShell title="Import run" flash={flash}>
          <p className="text-sm">
            Import runs are visible to the Secretariat only. This visit was recorded in the refusal log.{" "}
            <Link href={`/login?return=/mgr/import/${runId}`} className="underline">
              Switch login
            </Link>
            .
          </p>
        </AppShell>
      );
    }
    throw e;
  }
  if (!run) notFound();
  const rejected = run.rows.filter((r) => !r.ok);

  return (
    <AppShell title={`Import run ${run.runId.slice(0, 8)} — ${run.accepted} accepted, ${run.rejected} rejected`} flash={flash}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/mgr/import" className="underline">
            ← Import
          </Link>
          <span className="text-muted-foreground">
            {fmtDate(run.at)} · {run.filename ?? "uploaded file"} · {run.bytes.toLocaleString()} bytes · Party <span className="font-mono">{run.partyCode}</span>
          </span>
        </div>
        <div className="flex gap-2">
          {run.rejected ? (
            <a href={`/api/import/${run.runId}/errors.xlsx`} className={cn(buttonVariants({ size: "sm" }))} title="Same template, Data sheet holding only the rejected rows plus an Error column">
              Download error report (.xlsx)
            </a>
          ) : null}
          <Link href="/mgr/import" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Re-import corrected file
          </Link>
        </div>
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        Accepted rows are received pre-collection notifications with a B-SBI, <em>pending</em> Secretariat publication (publish from the batch page).
        Rejected rows carry field-level validation errors; nothing was written for them. This run is durable and appears in the Secretariat audit
        projection.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>B-SBI</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.rows.map((r) => (
              <TableRow key={r.row} className={r.ok ? undefined : "bg-red-50 dark:bg-red-900/10"}>
                <TableCell className="font-mono text-xs">{r.row}</TableCell>
                <TableCell className="text-xs">{r.ok ? "accepted → pending" : "rejected"}</TableCell>
                <TableCell className="text-xs">
                  {r.batchId ? (
                    <Link href={`/mgr/${r.batchId}`} className="underline">
                      {r.title}
                    </Link>
                  ) : (
                    r.values?.title || "—"
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.bSbi ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.receiptId ?? "—"}</TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">{r.error ?? "publish from the batch page"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rejected.length ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Rejected rows — values as received</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  {FIELD_DEFS.map((f) => (
                    <TableHead key={f.key} title={f.basis}>
                      {f.excelHeader}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejected.map((r) => (
                  <TableRow key={r.row}>
                    <TableCell className="font-mono text-xs">{r.row}</TableCell>
                    {FIELD_DEFS.map((f) => (
                      <TableCell key={f.key} className={cn("max-w-[14rem] truncate text-xs", !r.values?.[f.key] && f.required && "text-red-700 dark:text-red-300")}>
                        {r.values?.[f.key] || (f.required ? "(required, empty)" : "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
