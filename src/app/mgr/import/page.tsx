import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importMgrAction } from "@/server/actions";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS } from "@/server/import";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type RowResult = { row: number; ok: boolean; bSbi?: string; batchId?: string; title?: string; error?: string };

export default async function ImportPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const p = await getSessionUser();
  let results: RowResult[] | undefined;
  if (typeof sp.result === "string") {
    try {
      results = JSON.parse(sp.result) as RowResult[];
    } catch {
      results = undefined;
    }
  }

  if (!can(p, "import")) {
    return (
      <AppShell title="MGR — import offline template" flash={flash}>
        <p className="text-sm">
          Import is a Secretariat function (assisted channel for SIDS / low-bandwidth Parties).{" "}
          <Link href="/login?return=/mgr/import" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="MGR — import offline Excel template (Secretariat)" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Bounded and deterministic: .xlsx only, ≤ {IMPORT_MAX_BYTES / 1024 / 1024} MB, template marker and version checked, headers must match the
        current <code>FIELD_DEFS</code>, blank rows skipped, ≤ {IMPORT_MAX_ROWS} rows, formula cells rejected, one transaction per row. Each accepted
        row becomes a received pre-collection notification (<code>sourceChannel = excel</code>) with its own B-SBI, pending publication.
      </p>

      <form action={importMgrAction} className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <KeyFields returnTo="/mgr/import" />
        <Field label="Template file (.xlsx)" hint="Leave empty and use the sample to demo without a file.">
          <Input type="file" name="file" accept=".xlsx" />
        </Field>
        <Field label="Party code" hint="On whose behalf">
          <Input name="partyCode" defaultValue="XSD" maxLength={3} className="w-24" />
        </Field>
        <div className="flex gap-2">
          <SubmitButton>Import file</SubmitButton>
          <button type="submit" name="fixture" value="1" className="rounded-lg border px-3 text-sm hover:bg-muted" title="Uses the bundled sample workbook generated from the same template">
            Import sample fixture
          </button>
        </div>
      </form>

      <p className="text-sm">
        <a href="/api/template/mgr.xlsx" className="underline">
          Download the current template
        </a>{" "}
        (sheets: Meta · Data · Field guide).
      </p>

      {results ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>B-SBI</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.row}>
                  <TableCell>{r.row}</TableCell>
                  <TableCell>{r.ok ? "accepted" : "rejected"}</TableCell>
                  <TableCell>{r.batchId ? <Link href={`/mgr/${r.batchId}`} className="underline">{r.title}</Link> : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.bSbi ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.error ?? "received → pending; publish from the batch page"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </AppShell>
  );
}
