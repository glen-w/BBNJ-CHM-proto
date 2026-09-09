import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DomainBadge, DOMAIN_RAIL } from "@/components/chips";
import { DOMAIN_ICON, isAccentDomain, type AccentDomain } from "@/components/domain-icons";
import { flashFrom } from "@/components/flash";
import { RailsStrip } from "@/components/rails-strip";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { domainPath, fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { railCounts, recentPublished } from "@/server/queries";
import { SEED_HONESTY } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomePage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const counts = railCounts(db, p);
  const feed = recentPublished(db, p, 8);

  return (
    <AppShell flash={flash}>
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Clearing-House Mechanism</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Submit, manage, publish and notify across MGR, EIA, capacity-building and (as a stub) area-based management tools — one desk, four journeys.
        </p>
        <p className="max-w-3xl text-xs text-muted-foreground">{SEED_HONESTY}</p>
        {p.kind === "anonymous" ? (
          <p className="text-sm">
            You are browsing as the public.{" "}
            <Link href="/login" className="text-institutional underline underline-offset-2">
              Sign in
            </Link>{" "}
            to submit, publish or review.
          </p>
        ) : null}
      </section>

      <RailsStrip counts={counts} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <JourneyCard
          domain="mgr"
          title="MGR"
          href="/mgr"
          text="Pre-collection notification → valid receipt mints the Art 12 B-SBI → Secretariat publish mints the publicRecordId. Offline Excel template available for low-bandwidth Parties."
        />
        <JourneyCard
          domain="eia"
          title="EIA"
          href="/eia"
          text="Pack-level publish spine: screening, notices, draft EIA, STB comments, decision. Status lives on each pack; a published screening and a draft EIA coexist."
        />
        <JourneyCard
          domain="cbtmt"
          title="CBTMT"
          href="/capacity"
          text="Needs and offers as records; a match is a row plus a match_suggested event under a deterministic shared-theme rule."
        />
        <JourneyCard
          domain="abmt"
          title="ABMT"
          href="/abmt"
          text="Proposal stub on the same rails — draft → pending → published, receipt and BBNJ-ABMT id. Without prejudice to COP1; no content model yet."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recently published (visible to your role)</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {feed.map((f) => (
                <li
                  key={f.eventId}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 py-2 pl-2",
                    isAccentDomain(f.domain) && DOMAIN_RAIL[f.domain],
                  )}
                >
                  <Link href={domainPath(f.domain, f.recordId)} className="inline-flex flex-wrap items-center gap-2 hover:text-institutional hover:underline">
                    <DomainBadge domain={f.domain} withIcon />
                    <span>
                      {f.title} <span className="text-muted-foreground">· {stageLabel(f.stage)}</span>
                    </span>
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    {f.publicRecordId} · {fmtDate(f.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            <strong className="text-foreground">ABMT</strong> — thin stub only. Area-based management tools (Art 51.3(a)(ii)) are shown as a{" "}
            <code>proposal_stub</code> pack so the receipt and publish record can be seen to carry a fourth journey. Without prejudice to COP1.
          </div>
          <div className="rounded-lg border p-5 text-sm">
            <div className="mb-2 font-medium">Identifiers, in order</div>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">internalId</span> — UUID, at creation
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
            <div className="mt-3 flex flex-wrap gap-1">
              <a href="/api/export/mgr.csv" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="CSV of the MGR rows visible to your role">
                Export CSV
              </a>
              <a href="/api/export/audit.json" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="JSON envelope of the audit rows visible to your role">
                Audit JSON
              </a>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

/** Journeys are entry points into the shared rails — one quiet panel each, no competing brand (VISUAL-CHARTER.md §1.2). */
function JourneyCard({ domain, title, href, text }: { domain: AccentDomain; title: string; href: string; text: string }) {
  const Icon = DOMAIN_ICON[domain];
  return (
    <div className={cn("flex flex-col rounded-lg border bg-card p-5", DOMAIN_RAIL[domain])}>
      <h3 className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-institutional">
        <Icon aria-hidden="true" className="size-3.5" />
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 self-start")}>
        Open {title}
      </Link>
    </div>
  );
}
