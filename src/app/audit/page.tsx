import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { KeyFields, selectClass, SubmitButton } from "@/components/forms";
import { Timeline } from "@/components/timeline";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resetSandboxAction } from "@/server/actions";
import { listDigestRuns } from "@/server/digest";
import { listImportRuns } from "@/server/import";
import { can, listRefusals } from "@/server/policy";
import { auditRows } from "@/server/queries";
import { sandboxResetEnabled } from "@/server/reset";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AuditPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const p = await getSessionUser();
  const db = getDb();
  const domain = pick("domain");
  const status = pick("status");
  const highlight = pick("event") || undefined;
  const rows = auditRows(db, p, { domain: domain || undefined, status: status || undefined, limit: 300 });
  const full = can(p, "view_full_audit");
  const refusals = full ? listRefusals(db, p, 100) : [];
  const imports = full ? listImportRuns(db, p, 10) : [];
  const digests = full ? listDigestRuns(db, 10) : [];
  const showReset = full && sandboxResetEnabled();

  return (
    <AppShell title="Audit — events outbox" flash={flash}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every receipt, transition and publication is a row; rows are never updated or deleted. Notifications are fan-out of these rows.{" "}
          {full ? (
            <>
              You see the <strong>Secretariat projection</strong>: actor user, idempotency key, dispatch outcome, plus the refusal log, import runs and
              digest windows below.
            </>
          ) : (
            <>
              You see the <strong>public projection</strong>: published, public-tier rows; actor role, never user identifiers. Refusals, import runs
              and digest windows are not part of this projection.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <ExportLinks domain="audit" />
          {showReset ? (
            <form action={resetSandboxAction}>
              <KeyFields returnTo="/audit" />
              <SubmitButton variant="destructive" size="sm" title="Deletes the database file, recreates schema, and re-seeds">
                Reset database
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Domain</span>
          <select name="domain" defaultValue={domain} className={cn(selectClass, "w-40")}>
            <option value="">all</option>
            <option value="mgr">mgr</option>
            <option value="eia">eia</option>
            <option value="cbtmt">cbtmt</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Status</span>
          <select name="status" defaultValue={status} className={cn(selectClass, "w-40")}>
            <option value="">all</option>
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="published">published</option>
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "secondary" }))}>
          Filter
        </button>
        <span className="text-xs text-muted-foreground">{rows.length} rows</span>
      </form>
      <Timeline rows={rows} showRecord highlight={highlight} />

      {full ? (
        <>
          <section className="rounded-lg border" id="refusals">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Refusal log — every authorisation that was denied</h2>
              <span className="text-xs text-muted-foreground">{refusals.length} shown (newest first) · Secretariat projection only</span>
            </div>
            {refusals.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No refusals recorded yet. Try publishing as <code>party.nfp</code> or opening /mgr/import as the public.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>at</TableHead>
                    <TableHead>actor</TableHead>
                    <TableHead>action</TableHead>
                    <TableHead>domain / record</TableHead>
                    <TableHead>path</TableHead>
                    <TableHead>reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refusals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.at)}</TableCell>
                      <TableCell className="text-xs">
                        {r.actorRole}
                        {r.actorUserId ? <span className="ml-1 font-mono text-muted-foreground">…{r.actorUserId.slice(-4)}</span> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.action}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.domain ?? "—"}
                        {r.recordId ? ` · ${r.recordId.startsWith("BBNJ-") ? r.recordId : r.recordId.slice(0, 8)}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.path ?? "—"}</TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">{r.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border" id="imports">
              <div className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Import runs (offline Excel channel)</div>
              {imports.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No imports yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {imports.map((r) => (
                    <li key={r.runId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <Link href={`/mgr/import/${r.runId}`} className="underline">
                        {fmtDate(r.at)} · {r.filename ?? "upload"}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {r.accepted} accepted · {r.rejected} rejected · Party {r.partyCode}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border" id="digests">
              <div className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Digest windows delivered</div>
              {digests.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No digest run yet — run one from /notifications.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {digests.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <span>
                        <span className="font-mono">{d.username}</span> · {d.eventCount} event{d.eventCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.windowStart.startsWith("1970") ? "start" : fmtDate(d.windowStart)} → {fmtDate(d.windowEnd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
