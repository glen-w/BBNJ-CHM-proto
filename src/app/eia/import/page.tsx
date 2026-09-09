import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { EIA_SCREENING_FIELDS } from "@/lib/eia-fields";
import { fmtDate } from "@/lib/format";
import { importEiaAction } from "@/server/actions";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, listImportRuns } from "@/server/import";
import { can, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EiaImportPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();

  if (!can(p, "import")) {
    recordRefusal(p, "import", { domain: "eia", path: "/eia/import", reason: "EIA import page requested without the import permission" });
    return (
      <AppShell title="EIA — import offline screening template" flash={flash}>
        <p className="text-sm">
          Import is a Secretariat function (assisted channel for SIDS / low-bandwidth Parties). This visit was recorded in the refusal log.{" "}
          <Link href="/login?return=/eia/import" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  const runs = listImportRuns(getDb(), p, 20, "eia");

  return (
    <AppShell title="EIA — import offline screening template (Secretariat)" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        The same offline loop as MGR, applied to Art 31 screening (Art 51.5: access without undue burden). The Party downloads the template, fills one
        row per planned activity offline, sends it in; the Secretariat imports it here. Every accepted row becomes an <strong>activity</strong> (
        <code>sourceChannel = excel</code>) whose screening pack is <em>pending</em> with its outcome already recorded — so publication can never fail
        on a missing Art 31 outcome. Rejected rows come back as an <strong>error workbook</strong> for correction and re-import.
      </p>
      <p className="max-w-3xl text-xs text-muted-foreground">
        .xlsx only, ≤ {IMPORT_MAX_BYTES / 1024 / 1024} MB, template marker and version checked, headers must match ({EIA_SCREENING_FIELDS.map((f) => f.excelHeader).join(", ")}),
        blank rows skipped, ≤ {IMPORT_MAX_ROWS} rows, formula cells rejected, one transaction per row, one durable run record per import. A filled{" "}
        <code>party_code</code> cell wins over the default below.
      </p>

      <form action={importEiaAction} className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <KeyFields returnTo="/eia/import" />
        <Field label="Template file (.xlsx)" hint="Or use Import sample to try without a file.">
          <Input type="file" name="file" accept=".xlsx" />
        </Field>
        <Field label="Default Party code" hint="Used for rows with an empty party_code">
          <Input name="partyCode" defaultValue="XSD" maxLength={3} className="w-24" />
        </Field>
        <div className="flex gap-2">
          <SubmitButton>Import file</SubmitButton>
          <button
            type="submit"
            name="fixture"
            value="1"
            className="rounded-lg border px-3 text-sm hover:bg-muted"
            title="Sample workbook from the same template: two valid rows and one invalid row (unknown ABNJ box, bad outcome)"
          >
            Import sample (2 valid + 1 invalid)
          </button>
        </div>
      </form>

      <p className="text-sm">
        <a href="/api/template/eia-screening.xlsx" className="underline">
          Download the current screening template
        </a>{" "}
        (sheets: Meta · Data · Field guide).{" "}
        <Link href="/mgr/import" className="underline">
          MGR import
        </Link>{" "}
        uses the same loop.
      </p>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recent EIA import runs</h2>
        {runs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No EIA imports yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Default Party</TableHead>
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
                    <Link href={`/eia/import/${r.runId}`} className="underline">
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
