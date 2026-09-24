import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { RelatedSystemsList } from "@/components/related-systems";
import { buttonVariants } from "@/components/ui/button";
import { ABOUT_COMPARE_HIGHLIGHTS } from "@/lib/compare-rows";
import { cn } from "@/lib/utils";
import { SEED_HONESTY } from "@/server/seed-pack";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FEATURES = [
  "Structured intake — web forms and offline Excel for marine genetic resource notifications and environmental impact assessment screening, with an error workbook when a row fails",
  "Identifiers in order — a receipt, the Article 12 B-SBI when a pre-collection notification is valid, and a public record id when the Secretariat first publishes",
  "Each submission has its own status — draft, pending or published — so stages of one activity can sit side by side",
  "Five roles — Party, Secretariat, public, Scientific and Technical Body, and non-State provider. A refusal is recorded",
  "Confidentiality — public, restricted or confidential — on lists, exports and notifications",
  "Notifications in the Clearing House — subscriptions, immediate alerts and digests",
  "Search that respects confidentiality — a restricted record does not appear for a public reader",
  "Labels on illustrative records — Interim (DOALOS), or an example scenario",
  "A library of open-access research and resources — a citation and a link. A paper appears on a record when it shares that journey and that place",
];

export default async function AboutPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);

  return (
    <AppShell title="About the Clearing House" flash={flash}>
      <div className="max-w-3xl space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What this Clearing House is</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{SEED_HONESTY}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Submit, manage, publish and notify across marine genetic resources, environmental impact assessment, capacity-building and
            area-based management.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What it does</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Identifiers, in order</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="font-mono text-foreground">internalId</span> — UUID at creation
            </li>
            <li>
              <span className="font-mono text-foreground">receiptId</span> — pack enters pending
            </li>
            <li>
              <span className="font-mono text-foreground">B-SBI</span> — valid MGR pre-collection receipt (Art 12), before any publish
            </li>
            <li>
              <span className="font-mono text-foreground">publicRecordId</span> — first pack publish on the record
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Stable public URL:{" "}
            <Link href="/records/BBNJ-MGR-2026-00001" className="font-mono text-foreground underline underline-offset-2 hover:text-institutional">
              /records/&lt;publicRecordId&gt;
            </Link>
            — resolves to the owning record, subject to the same read policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Interim pages and this Clearing House</h2>
          <p className="text-sm text-muted-foreground">
            The interim DOALOS pages are informational. This Clearing House receives, checks, stores, publishes and notifies.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Area</th>
                  <th className="px-4 py-2 font-medium">Interim</th>
                  <th className="px-4 py-2 font-medium">This Clearing House</th>
                </tr>
              </thead>
              <tbody>
                {ABOUT_COMPARE_HIGHLIGHTS.map((row) => (
                  <tr key={row.title} className="border-b align-top last:border-0">
                    <td className="px-4 py-2 font-medium">
                      <Link href={row.href} className="hover:text-institutional hover:underline">{row.title}</Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.interim}</td>
                    <td className="px-4 py-2">{row.prototype}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/compare" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Full comparison with live deep links
            </Link>
            <Link href="/exhibit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Expression of interest
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Offline submission</h2>
          <p className="text-sm text-muted-foreground">
            Download a template, fill it offline, import it, correct any rows the workbook flags, and import again. Transfer times under Speed
            are estimates for slow and satellite links, not measurements from the field.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings?tab=speed" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Connection estimates
            </Link>
            <Link href="/settings?tab=demo" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Guided demo paths
            </Link>
            <a href="/api/template/mgr.xlsx" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              MGR template (.xlsx)
            </a>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Related systems</h2>
          <p className="text-sm text-muted-foreground">Links only. This Clearing House does not exchange data with them.</p>
          <RelatedSystemsList />
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Area-based management</strong> proposals follow the same receipt and publication path. The full content of a measure is for the Conference of the Parties.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <a href="/api/export/mgr.csv" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Export CSV (.csv)
            </a>
            <a href="/api/export/audit.json" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Audit JSON (.json)
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
