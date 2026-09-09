import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { importMgrAction } from "@/server/actions";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, listImportRuns } from "@/server/import";
import { can, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ImportPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();

  if (!can(p, "import")) {
    recordRefusal(p, "import", { domain: "mgr", path: "/mgr/import", reason: "Import page requested without the import permission" });
    return (
      <AppShell title="MGR — import offline template" flash={flash}>
        <p className="text-sm">
          Import is a Secretariat function (assisted channel for SIDS / low-bandwidth Parties). This visit was recorded in the refusal log.{" "}
          <Link href="/login?return=/mgr/import" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  const runs = listImportRuns(getDb(), p, 20, "mgr");

  return (
    <AppShell title="MGR — import offline Excel template (Secretariat)" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        The closed loop for offline submitters: the Party downloads the template, fills it offline, sends it in; the Secretariat imports it here. Every
        accepted row becomes a received pre-collection notification (<code>sourceChannel = excel</code>) with its own B-SBI, pending publication. Every
        rejected row is reported with its field-level errors and can be downloaded as an <strong>error workbook</strong> — the same template, pre-filled
        with only the failed rows — for correction and re-import.
      </p>
      <p className="max-w-3xl text-xs text-muted-foreground">
        .xlsx only, ≤ {IMPORT_MAX_BYTES / 1024 / 1024} MB, template marker and version checked, headers must match the current template, blank rows
        skipped, ≤ {IMPORT_MAX_ROWS} rows, formula cells rejected, one transaction per row, one durable run record per import.
      </p>

      <form action={importMgrAction} className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <KeyFields returnTo="/mgr/import" />
        <Field label="Template file (.xlsx)" hint="Or use Import sample to try without a file.">
          <Input type="file" name="file" accept=".xlsx" />
        </Field>
        <Field label="Party code" hint="On whose behalf">
          <Input name="partyCode" defaultValue="XSD" maxLength={3} className="w-24" />
        </Field>
        <div className="flex gap-2">
          <SubmitButton>Import file</SubmitButton>
          <button
            type="submit"
            name="fixture"
            value="1"
            className="rounded-lg border px-3 text-sm hover:bg-muted"
            title="Sample workbook from the same template: two valid rows and one invalid row"
          >
            Import sample (2 valid + 1 invalid)
          </button>
        </div>
      </form>

      <p className="text-sm">
        <a href="/api/template/mgr.xlsx" className="underline">
          Download the current template
        </a>{" "}
        (sheets: Meta · Data · Field guide).
      </p>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent import runs</h2>
        {runs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Rejected</TableHead>
                <TableHead>Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.runId}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.at)}</TableCell>
                  <TableCell className="text-xs">{r.filename ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.partyCode}</TableCell>
                  <TableCell className="text-xs">{r.accepted}</TableCell>
                  <TableCell className="text-xs">{r.rejected}</TableCell>
                  <TableCell className="text-xs">
                    <Link href={`/mgr/import/${r.runId}`} className="underline">
                      {r.runId.slice(0, 8)}
                    </Link>
                    {r.rejected ? (
                      <>
                        {" · "}
                        <a href={`/api/import/${r.runId}/errors.xlsx`} className="underline">
                          errors.xlsx
                        </a>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AppShell>
  );
}
