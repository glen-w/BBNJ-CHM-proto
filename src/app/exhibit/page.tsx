import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { EXHIBIT_AS_OF, EXHIBIT_LIMITS, EXHIBIT_LOGINS, EXHIBIT_SECTIONS } from "@/lib/exhibit";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { listAbmtProposals, listCbtmtRecords, listEiaActivities, listMgrBatches } from "@/server/queries";
import { csvStorylineCounts, SEED_HONESTY } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

export default async function ExhibitPage() {
  const p = await getSessionUser();
  const db = getDb();
  const live = {
    mgr: listMgrBatches(db, p).length,
    eia: listEiaActivities(db, p).length,
    cbtmt: listCbtmtRecords(db, p).length,
    abmt: listAbmtProposals(db, p).length,
  };
  const csv = csvStorylineCounts();

  return (
    <AppShell title="Evaluator exhibit — Session 1 / EOI">
      <div className="max-w-3xl space-y-8 print:max-w-none">
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            One page for a Session&nbsp;1 / expression-of-interest evaluator. Print from the browser (chrome hides).{" "}
            {EXHIBIT_AS_OF}. {SEED_HONESTY}
          </p>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href="/compare" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Full comparison with live links
            </Link>
            <Link href="/settings?tab=demo" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Demo user path
            </Link>
            <Link href="/about" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              About this desk
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Hands-on</h2>
          <p className="text-sm text-muted-foreground">
            <code className="font-mono text-foreground">npm ci &amp;&amp; npm run db:seed &amp;&amp; npm run dev</code>
            {" — or "}
            <code className="font-mono text-foreground">docker compose up --build</code>
            . Five passwordless logins at <Link href="/login" className="underline">/login</Link>. No hosted public URL.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Username</th>
                  <th className="px-4 py-2 font-medium">Stands for</th>
                  <th className="px-4 py-2 font-medium">Can</th>
                </tr>
              </thead>
              <tbody>
                {EXHIBIT_LOGINS.map((row) => (
                  <tr key={row.username} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{row.username}</td>
                    <td className="px-4 py-2">{row.role}</td>
                    <td className="px-4 py-2 text-muted-foreground">{row.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">What is in this sandbox</h2>
          <p className="text-sm text-muted-foreground">
            Visible to <span className="font-mono text-foreground">{p.kind === "user" ? p.user.username : "anonymous public"}</span>
            : {live.mgr} MGR · {live.eia} EIA · {live.cbtmt} CBTMT · {live.abmt} ABMT. CSV storylines (plus smoke
            fixtures): {csv.mgr} MGR · {csv.eia} EIA · {csv.cbtmtNeeds} needs · {csv.cbtmtOffers} offers · {csv.cbtmtMatches}{" "}
            matches · {csv.abmt} ABMT stubs · {csv.abnjBoxes} ABNJ boxes.
          </p>
          <p className="text-sm text-muted-foreground">
            Geography now includes the Central Indian Ridge, Tonga-Kermadec Arc and Southern Ocean Polar Front beside the
            Atlantic / CCZ set. Look for utilisation (Art 12.8), a pending MGR, an assisted SIDS notice, a full EIA
            monitoring spine, unmatched CBTMT rows, and Interim vs Demo badges.
          </p>
        </section>

        {EXHIBIT_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Area</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">What you can show</th>
                    <th className="px-4 py-2 font-medium print:hidden">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.area} className="border-b align-top last:border-0">
                      <td className="px-4 py-2 font-medium">{row.area}</td>
                      <td className="px-4 py-2">
                        <span className="rounded border px-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.evidence}</td>
                      <td className="px-4 py-2 print:hidden">
                        <Link href={row.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                          {row.label}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Stated limits</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {EXHIBIT_LIMITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
