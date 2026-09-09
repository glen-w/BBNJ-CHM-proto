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
  "Structured intake — web forms plus offline Excel (MGR pre-collection and EIA screening) with error workbooks",
  "Identifiers in order — receipt → Art 12 B-SBI at valid MGR receipt (before publish) → publicRecordId at first publish",
  "Pack status, not record status — draft / pending / published on each pack so stages can coexist",
  "Five roles enforced on the server — Party, Secretariat, public, STB, non-State uploader; every refusal logged",
  "Confidentiality tiers — public / restricted / confidential on every list, export and notification",
  "In-app notify — subscriptions, hold + digest semantics (no e-mail in this build)",
  "Policy-aware full-text search — restricted rows never leak to public readers",
  "Honesty labels — Interim (DOALOS) vs Demo scenario badges on seeded storylines",
];

export default async function AboutPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);

  return (
    <AppShell title="About this desk" flash={flash}>
      <div className="max-w-3xl space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What this desk is</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{SEED_HONESTY}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Submit, manage, publish and notify across MGR, EIA, capacity-building and (as a stub) area-based management tools — one desk, four
            journeys on shared rails.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What you can demonstrate</h2>
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
          <h2 className="text-lg font-semibold">Interim set-up vs this desk</h2>
          <p className="text-sm text-muted-foreground">
            The interim DOALOS pages are informational; this prototype is transactional. A design contrast, not a critique.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Area</th>
                  <th className="px-4 py-2 font-medium">Interim</th>
                  <th className="px-4 py-2 font-medium">This desk</th>
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
          <Link href="/compare" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Full comparison with live deep links
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Offline loop &amp; speed tests</h2>
          <p className="text-sm text-muted-foreground">
            Art 51.5 pattern proof: download template → fill offline → import → per-row validation → error workbook → re-import. Wire time on
            mocked SIDS / satellite profiles is calculated from nominal bandwidth; parse time is measured locally. Not a field measurement.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings?tab=speed" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Speed tests (Settings)
            </Link>
            <Link href="/settings?tab=demo" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Demo user path
            </Link>
            <a href="/api/template/mgr.xlsx" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              MGR template (.xlsx)
            </a>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Related systems</h2>
          <p className="text-sm text-muted-foreground">Reference links only — not federation or data exchange.</p>
          <RelatedSystemsList />
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">ABMT</strong> is a thin stub only — same rails, without prejudice to COP1.
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
