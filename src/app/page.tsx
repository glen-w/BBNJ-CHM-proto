import Link from "next/link";

import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, DomainBadge, DOMAIN_RAIL, ProvenanceBadge, StatusChip } from "@/components/chips";
import { DOMAIN_ICON, isAccentDomain, type AccentDomain } from "@/components/domain-icons";
import { flashFrom } from "@/components/flash";
import { HomeWelcomeBand } from "@/components/home-welcome-band";
import { RailsStrip } from "@/components/rails-strip";
import { RelatedSystemsList } from "@/components/related-systems";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { domainPath, fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listAbmtProposals, listCbtmtRecords, listEiaActivities, listMgrBatches, railCounts, recentPublished } from "@/server/queries";
import { SEED_HONESTY } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomePage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const counts = railCounts(db, p);
  const feed = recentPublished(db, p, 8);
  const journeys = {
    mgr: listMgrBatches(db, p).length,
    eia: listEiaActivities(db, p).length,
    cbtmt: listCbtmtRecords(db, p).length,
    abmt: listAbmtProposals(db, p).length,
  };

  return (
    <AppShell flash={flash}>
      <HomeWelcomeBand />

      {p.kind === "anonymous" ? (
        <p className="text-sm">
          You are browsing as the public.{" "}
          <Link href="/login" className="text-institutional underline underline-offset-2">
            Sign in
          </Link>{" "}
          to submit, publish or review.
        </p>
      ) : null}

      <RailsStrip counts={counts} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <JourneyCard
          domain="mgr"
          title="MGR"
          href="/mgr"
          count={journeys.mgr}
          rail="Notify → receipt → publish"
          about="Pre-collection notification → valid receipt mints the Art 12 B-SBI → Secretariat publish mints the publicRecordId. Offline Excel template available for low-bandwidth Parties."
        />
        <JourneyCard
          domain="eia"
          title="EIA"
          href="/eia"
          count={journeys.eia}
          rail="Screen → notice → draft EIA"
          about="Pack-level publish spine: screening, notices, draft EIA, STB comments, decision. Status lives on each pack; a published screening and a draft EIA coexist."
        />
        <JourneyCard
          domain="cbtmt"
          title="CBTMT"
          href="/capacity"
          count={journeys.cbtmt}
          rail="Need / offer → match"
          about="Needs and offers as records; a match is a row plus a match_suggested event under a deterministic shared-theme rule."
        />
        <JourneyCard
          domain="abmt"
          title="ABMT"
          href="/abmt"
          count={journeys.abmt}
          rail="Stub → receipt → publish"
          about="Proposal stub on the same rails — draft → pending → published, receipt and BBNJ-ABMT id. Without prejudice to COP1; no content model yet."
        />
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recently published (visible to your role)</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing published yet.</p>
        ) : (
          <ul className="divide-y">
            {feed.map((f) => (
                <li
                key={f.eventId}
                className={cn("py-4 pl-2.5", isAccentDomain(f.domain) && DOMAIN_RAIL[f.domain])}
              >
                <Link href={domainPath(f.domain, f.recordId)} className="block hover:text-institutional">
                  <span className="flex flex-wrap items-center gap-2">
                    <DomainBadge domain={f.domain} withIcon />
                    <span className="font-medium leading-snug">{f.title}</span>
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusChip status={f.status} />
                    {f.confidentiality !== "public" ? <ConfidentialityBadge tier={f.confidentiality} /> : null}
                    {f.provenanceBadge ? <ProvenanceBadge badge={f.provenanceBadge} /> : null}
                    <span className="text-sm text-muted-foreground">{stageLabel(f.stage)}</span>
                  </span>
                  <span className="mt-3 block font-mono text-xs leading-relaxed text-muted-foreground">
                    {f.publicRecordId ?? "—"} · {fmtDate(f.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AboutPanel id="about-desk" title="About this desk">
        <p>{SEED_HONESTY}</p>
        <p>
          Submit, manage, publish and notify across MGR, EIA, capacity-building and (as a stub) area-based management tools — one desk, four
          journeys.
        </p>
        <div>
          <div className="mb-1 font-medium text-foreground">Identifiers, in order</div>
          <ol className="list-decimal space-y-1 pl-5">
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
        </div>
        <p>
          Stable public URL:{" "}
          <Link href="/records/BBNJ-MGR-2026-00001" className="font-mono text-foreground underline underline-offset-2 hover:text-institutional">
            /records/&lt;publicRecordId&gt;
          </Link>
          — resolves to the owning record, subject to the same read policy.
        </p>
        <div>
          <div className="mb-1 font-medium text-foreground">Related systems (reference — not federation)</div>
          <RelatedSystemsList />
        </div>
        <p>
          <strong className="text-foreground">ABMT</strong> is a thin stub only. Area-based management tools (Art 51.3(a)(ii)) ride a{" "}
          <code>proposal_stub</code> pack so receipt and publish can be seen to carry a fourth journey. Without prejudice to COP1.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export/mgr.csv" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="CSV of the MGR rows visible to your role">
            Export CSV (.csv)
          </a>
          <a href="/api/export/audit.json" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} title="JSON envelope of the audit rows visible to your role">
            Audit JSON (.json)
          </a>
        </div>
      </AboutPanel>
    </AppShell>
  );
}

function JourneyCard({
  domain,
  title,
  href,
  count,
  rail,
  about,
}: {
  domain: AccentDomain;
  title: string;
  href: string;
  count: number;
  rail: string;
  about: string;
}) {
  const Icon = DOMAIN_ICON[domain];
  return (
    <div className={cn("flex flex-col rounded-lg border bg-card p-4", DOMAIN_RAIL[domain])}>
      <h3 className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-institutional">
        <Icon aria-hidden="true" className="size-3.5" />
        {title}
      </h3>
      <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">
        {count} <span className="text-sm font-normal text-muted-foreground">visible</span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{rail}</p>
      <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 self-start")}>
        Open {title}
      </Link>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">About this workflow</summary>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{about}</p>
      </details>
    </div>
  );
}
