import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, DomainBadge, DOMAIN_RAIL, ProvenanceBadge, StatusChip } from "@/components/chips";
import { DOMAIN_ICON, isAccentDomain, type AccentDomain } from "@/components/domain-icons";
import { flashFrom } from "@/components/flash";
import { HomeWelcomeBand } from "@/components/home-welcome-band";
import { RailsStrip } from "@/components/rails-strip";
import { getDb } from "@/lib/db";
import { domainPath, fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listAbmtProposals, listCbtmtRecords, listEiaActivities, listMgrBatches, railCounts, recentPublished } from "@/server/queries";
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

      <section id="journeys" className="grid scroll-mt-20 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <section id="recent-records" className="scroll-mt-20 rounded-lg border bg-card p-5">
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
