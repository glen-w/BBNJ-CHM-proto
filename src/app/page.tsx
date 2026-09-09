import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { RailsStrip } from "@/components/rails-strip";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { DOMAIN_LABEL, domainPath, fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { railCounts, recentPublished } from "@/server/queries";
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
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">One shared Cl-HM substrate</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Receipt → management → publication/notification → user roles. MGR, EIA and CBTMT are three journeys through the same rails —
          a transactional contrast to the interim DOALOS static/informational site.
        </p>
        {p.kind === "anonymous" ? (
          <p className="text-sm">
            You are browsing as the public.{" "}
            <Link href="/login" className="underline">
              Pick a sandbox login
            </Link>{" "}
            to submit, publish or review.
          </p>
        ) : null}
      </section>

      <RailsStrip counts={counts} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <JourneyCard
          title="MGR"
          href="/mgr"
          text="Pre-collection notification → valid receipt mints the Art 12 B-SBI → Secretariat publish mints the publicRecordId → bell + audit. Offline Excel template for SIDS."
        />
        <JourneyCard
          title="EIA"
          href="/eia"
          text="Pack-level publish spine: screening, notices, draft EIA, STB comments, decision. Status lives on each pack; a published screening and a draft EIA coexist."
        />
        <JourneyCard title="CBTMT" href="/capacity" text="Needs and offers as records; a match is a row plus a match_suggested event. Deterministic shared-theme rule, no ML." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Recently published (visible to your role)</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {feed.map((f) => (
                <li key={f.eventId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={domainPath(f.domain, f.recordId)} className="hover:underline">
                    <span className="mr-2 rounded bg-muted px-1.5 text-xs">{DOMAIN_LABEL[f.domain]}</span>
                    {f.title} <span className="text-muted-foreground">· {stageLabel(f.stage)}</span>
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
            <strong className="text-foreground">ABMT</strong> is reserved in the contract enum and disabled in this build. The same
            receipt/publish record would carry Art 51.3(a)(ii) ABMT packages later.
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
            <Link href="/compare" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-3")}>
              DOALOS contrast
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function JourneyCard({ title, href, text }: { title: string; href: string; text: string }) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
        Open journey
      </Link>
    </div>
  );
}
