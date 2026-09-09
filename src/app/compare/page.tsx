import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildCompareSections } from "@/lib/compare-rows";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { findEventByKey } from "@/server/outbox";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

export default async function ComparePage() {
  const p = await getSessionUser();
  const db = getDb();
  const rec = (key: string) => findEventByKey(db, `seed:${key}`)?.recordId;
  const sections = buildCompareSections({
    mgrA: rec("mgr-a"),
    mgrD: rec("mgr-d"),
    eia2: rec("eia-2"),
    eia3: rec("eia-3"),
    need: rec("cbtmt-need"),
    abmt: rec("abmt-1"),
    secretariat: can(p, "view_full_audit"),
  });

  return (
    <AppShell title="DOALOS interim set-up vs this prototype — by Session 1 basic function">
      <div className="space-y-6">
        <p className="max-w-3xl text-muted-foreground">
          The interim Cl-HM pages operated by DOALOS are, as far as their public pages show, informational: documents, meeting pages, contact points.
          The &ldquo;interim&rdquo; column below describes what is visible on those pages, not what may exist behind them. This prototype is
          transactional — structured receipt → validation → storage → publication → alert → audit — organised around the three basic functions the
          Session 1 basic functions ask for. Every row links into the live desk for your current role.
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
                    <th className="px-4 py-2 font-medium">This prototype</th>
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
            <strong className="text-foreground">Read this honestly.</strong> Static/informational → transactional workflow across Agreement areas — same
            rails, multiple journeys. Mapping: consolidated draft study (DOALOS, Mar 2026) ¶61 basic functionalities; PrepCom3 informal outcome annex
            parameters (roles, TK, alerts, offline, languages); Art 51.5 (access for developing States / SIDS without undue burden). Demo values are
            labelled as such (30-day comment window, B-SBI shape). Not implemented by design: production authentication, e-mail or push delivery (in-app
            bell only), federation with ABSCH / BCH / OBIS (reference links only), full-text search, ABS tracing, ML matching, GIS, a proprietary
            confidentiality category. ABMT is a stub. Without prejudice to COP1.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
