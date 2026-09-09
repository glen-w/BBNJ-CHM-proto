import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { SpeedLabPanel } from "@/components/speed-lab-panel";
import { buttonVariants } from "@/components/ui/button";
import { demoUserBeats } from "@/lib/demo-user-beats";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { findEventByKey } from "@/server/outbox";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { id: "demo", label: "Demo user" },
  { id: "speed", label: "Speed" },
  { id: "desk", label: "Desk" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabOf(raw: string | undefined): TabId {
  if (raw === "speed" || raw === "desk") return raw;
  return "demo";
}

export default async function SettingsPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const tab = tabOf(typeof sp.tab === "string" ? sp.tab : undefined);
  const p = await getSessionUser();
  const db = getDb();
  const rec = (key: string) => findEventByKey(db, `seed:${key}`)?.recordId;
  const beats = demoUserBeats({ mgrA: rec("mgr-a"), eia2: rec("eia-2") });
  const canRunSpeed = can(p, "import");

  return (
    <AppShell title="Settings" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Desk configuration and the guided demo path. Subscription filters remain on{" "}
        <Link href="/preferences" className="underline">preferences</Link>.
      </p>

      <nav aria-label="Settings sections" className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={cn(
              buttonVariants({ variant: tab === t.id ? "secondary" : "ghost", size: "sm" }),
              tab === t.id && "font-medium",
            )}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "demo" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Demo user path</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Five beats through the shared rails — sign in as each role, then open the live route. Clone or Docker gives the same hands-on path
              without a hosted public URL.
            </p>
          </div>
          <ol className="space-y-3">
            {beats.map((beat) => (
              <li key={beat.n} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">
                    <span className="me-2 font-mono text-xs text-muted-foreground">{beat.n}.</span>
                    {beat.title}
                  </h3>
                  <span className="rounded border border-line bg-muted px-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {beat.login}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{beat.blurb}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/login?return=${encodeURIComponent(beat.href)}&user=${beat.login}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Sign in as {beat.login}
                  </Link>
                  <Link href={beat.href} className={cn(buttonVariants({ size: "sm" }))}>
                    Open route
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Full interim comparison: <Link href="/compare" className="underline">/compare</Link> · Narrated script: <code>DEMO-SCRIPT.md</code>
          </p>
        </section>
      ) : null}

      {tab === "speed" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Speed tests — offline loop</h2>
          <SpeedLabPanel canRun={canRunSpeed} returnTo="/settings?tab=speed" />
        </section>
      ) : null}

      {tab === "desk" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Desk configuration</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Placeholders for operator settings that would arrive with a production desk. Cookie logins and seeded accounts remain the demo affordance.
          </p>
          <ul className="divide-y rounded-lg border text-sm">
            <li className="px-4 py-3">
              <div className="font-medium">UI language</div>
              <p className="mt-1 text-muted-foreground">
                Treaty-text locale is in the masthead. Full six-language UI catalogs are deferred — human i18n, not machine translation.
              </p>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">Notification channels</div>
              <p className="mt-1 text-muted-foreground">In-app only in this build. SMTP and digest scheduling would attach to the same outbox semantics.</p>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">Controlled vocabularies</div>
              <p className="mt-1 text-muted-foreground">ABNJ boxes, CBTMT themes and confidentiality labels are fixed in seed data until an operator backend ships.</p>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">Subscriptions</div>
              <p className="mt-1 text-muted-foreground">
                <Link href="/preferences" className="underline">Manage subscription filters</Link> — domain, ABNJ box, theme and digest cadence.
              </p>
            </li>
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
