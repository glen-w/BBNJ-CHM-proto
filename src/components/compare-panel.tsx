import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { CompareSection } from "@/lib/compare-rows";
import { cn } from "@/lib/utils";

/** Shared interim-vs-Clearing-House compare body — used on /compare and Settings → Compare. */
export function ComparePanel({ sections }: { sections: CompareSection[] }) {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-muted-foreground">
        The interim Clearing-House pages operated by DOALOS are, as far as their <strong className="font-medium text-foreground">public</strong> pages
        show (as of Sep 2026), informational: documents, meeting pages, contact points. The interim column describes what is
        visible on those pages — not what may exist behind them — and is dated so it can be revisited. This Clearing House receives a record,
        checks it, stores it, publishes it, notifies subscribers and keeps an audit trail. Every row opens the corresponding page for your role.
      </p>

      {sections.map((s) => (
        <section key={s.n} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {s.n}. {s.title}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{s.para}</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Area</th>
                  <th className="px-4 py-2 font-medium">Interim DOALOS</th>
                  <th className="px-4 py-2 font-medium">This Clearing House</th>
                  <th className="px-4 py-2 font-medium">See it live</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.area} className="border-b align-top last:border-0">
                    <td className="px-4 py-2 font-medium">{r.area}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.interim}</td>
                    <td className="px-4 py-2">{r.prototype}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.links.map((l) =>
                          l.external ? (
                            <a key={l.href} href={l.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                              {l.label}
                            </a>
                          ) : (
                            <Link key={l.href} href={l.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                              {l.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="rounded-lg border p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Scope.</strong> The comparison follows the basic functions in the consolidated draft study (DOALOS,
          March 2026, paragraph 61), the PrepCom3 informal outcome (roles, traditional knowledge, alerts, offline access, languages), and Article 51.5
          on access for developing States and small island developing States. The comment window is 30 days unless an activity sets a date; the
          Agreement does not fix a number of days. Not included: production sign-in, e-mail or push notifications, data exchange with other
          clearing-houses, map search, access-and-benefit-sharing tracing, automated matching, or a separate proprietary confidentiality category.
          Area-based management proposals are without prejudice to COP1.
        </p>
      </section>
    </div>
  );
}
