import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ComparePanel } from "@/components/compare-panel";
import { flashFrom } from "@/components/flash";
import { KeyFields, SubmitButton } from "@/components/forms";
import { SpeedLabPanel } from "@/components/speed-lab-panel";
import { buttonVariants } from "@/components/ui/button";
import { buildCompareSections } from "@/lib/compare-rows";
import { demoUserBeats } from "@/lib/demo-user-beats";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { setResearchLaneAction } from "@/server/actions";
import { findEventByKey } from "@/server/outbox";
import { can } from "@/server/policy";
import { isResearchLaneEnabled } from "@/server/research";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { id: "demo", label: "Guided path" },
  { id: "speed", label: "Speed" },
  { id: "desk", label: "Desk" },
  { id: "compare", label: "Compare" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabOf(raw: string | undefined): TabId {
  if (raw === "speed" || raw === "desk" || raw === "compare") return raw;
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
  const researchLaneOn = isResearchLaneEnabled(db);
  const compareSections = buildCompareSections({
    mgrA: rec("mgr-a"),
    mgrD: rec("mgr-d"),
    eia2: rec("eia-2"),
    eia3: rec("eia-3"),
    need: rec("cbtmt-need"),
    abmt: rec("abmt-1"),
    secretariat: can(p, "view_full_audit"),
  });

  return (
    <AppShell title="Settings" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Settings for this Clearing House. Subscription filters are on{" "}
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
            <h2 className="text-lg font-semibold">Guided path</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Five steps through the Clearing House. Sign in as each role, then open the page.
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
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Expression of interest: <Link href="/exhibit" className="underline">summary</Link>
            {" · "}
            Comparison with the interim pages: <Link href="/settings?tab=compare" className="underline">compare</Link>
          </p>
        </section>
      ) : null}

      {tab === "speed" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Connection estimates</h2>
          <SpeedLabPanel canRun={canRunSpeed} returnTo="/settings?tab=speed" />
        </section>
      ) : null}

      {tab === "desk" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Clearing House</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Options for this Clearing House.
          </p>
          <ul className="divide-y rounded-lg border text-sm">
            <li className="px-4 py-3">
              <div className="font-medium">Show related research</div>
              <p className="mt-1 text-muted-foreground">
                Shows or hides the Library and the related-research panels on records. When hidden, those links are gone.
              </p>
              <form action={setResearchLaneAction} className="mt-3 flex flex-wrap items-center gap-2">
                <KeyFields returnTo="/settings?tab=desk" />
                <input type="hidden" name="enabled" value={researchLaneOn ? "0" : "1"} />
                <SubmitButton size="sm" variant="outline">
                  {researchLaneOn ? "Turn off" : "Turn on"}
                </SubmitButton>
                <span className="text-xs text-muted-foreground">{researchLaneOn ? "Currently shown." : "Currently hidden."}</span>
              </form>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">UI language</div>
              <p className="mt-1 text-muted-foreground">
                The masthead can show the Agreement text in six languages. The interface is in English.
              </p>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">Notification channels</div>
              <p className="mt-1 text-muted-foreground">Notifications appear in the Clearing House. E-mail is not included.</p>
            </li>
            <li className="px-4 py-3">
              <div className="font-medium">Controlled vocabularies</div>
              <p className="mt-1 text-muted-foreground">Areas, capacity-building themes and confidentiality labels are set for this Clearing House.</p>
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

      {tab === "compare" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Compare</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Interim DOALOS pages and this Clearing House, side by side.
            </p>
          </div>
          <ComparePanel sections={compareSections} />
        </section>
      ) : null}
    </AppShell>
  );
}
