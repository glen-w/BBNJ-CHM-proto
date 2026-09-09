import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { AuditRibbon } from "@/components/audit-ribbon";
import { FlashBanner, type Flash } from "@/components/flash";
import { LanguageControl } from "@/components/language-control";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { TREATY_LANG_COOKIE, treatyLangOf } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions";
import { actorRoleOf, can } from "@/server/policy";
import { latestVisibleEvent, notificationsFor, unreadCount } from "@/server/queries";
import { getSessionUser } from "@/server/session";

// Journeys are entry points into the shared rails, not competing brands (VISUAL-CHARTER.md §1.2, §4).
const journeys = [
  { href: "/mgr", label: "MGR", caption: "marine genetic resources", enabled: true },
  { href: "/eia", label: "EIA", caption: "environmental impact assessment", enabled: true },
  { href: "/capacity", label: "CBTMT", caption: "capacity-building & technology transfer", enabled: true },
  { href: "/abmt", label: "ABMT", caption: "unavailable", enabled: false },
] as const;

const railLink = "rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const journeyTab =
  "inline-flex items-center gap-1.5 border-b-2 border-transparent px-1 py-2 text-sm font-medium text-foreground/85 hover:border-line hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export async function AppShell({
  title,
  flash,
  children,
}: {
  title?: string;
  flash?: Flash;
  children: React.ReactNode;
}) {
  const principal = await getSessionUser();
  const db = getDb();
  const unread = unreadCount(db, principal);
  const recent = notificationsFor(db, principal, 8);
  const latest = latestVisibleEvent(db, principal);
  const role = actorRoleOf(principal);
  const username = principal.kind === "user" ? principal.user.username : "anonymous";
  const store = await cookies();
  const treatyLang = treatyLangOf(store.get(TREATY_LANG_COOKIE)?.value);

  return (
    <div className="min-h-full flex flex-col bg-background text-foreground">
      <header className="border-b bg-card">
        {/* Utility: official BBNJ language links (treaty text only — UI stays English). */}
        <div className="border-b border-institutional/40 bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-1.5">
            <p className="text-xs text-muted-foreground">Welcome to the United Nations</p>
            <LanguageControl active={treatyLang.code} />
          </div>
        </div>

        {/* Brand: emblem · agreement title · Cl-HM desk · rails · role (VISUAL-CHARTER.md §4). */}
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Image src="/bbnj-emblem.svg" alt="" width={40} height={40} className="shrink-0" unoptimized />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-snug tracking-tight text-foreground sm:text-sm">
                  Agreement on Marine Biological Diversity of Areas beyond National Jurisdiction
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                  <span>BBNJ Agreement</span>
                  <span aria-hidden="true" className="text-line">
                    ·
                  </span>
                  <span className="font-medium text-institutional">BBNJ Cl-HM</span>
                  <span>working desk</span>
                </span>
              </span>
            </Link>
            <span aria-hidden="true" className="hidden h-10 w-px bg-line sm:block" />
            <nav aria-label="Rails" className="flex flex-wrap items-center gap-1">
              <Link href="/audit" className={railLink}>
                Audit
              </Link>
              {principal.kind === "user" ? (
                <Link href="/notifications" className={railLink}>
                  Notifications
                </Link>
              ) : null}
              {can(principal, "comment_stb") ? (
                <Link href="/stb" className={railLink}>
                  STB queue
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            {principal.kind === "user" ? (
              <details className="relative">
                <summary
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "cursor-pointer list-none")}
                  title="Notifications"
                  aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                >
                  <Bell aria-hidden="true" />
                  {unread > 0 ? (
                    <span className="rounded-full bg-institutional px-1.5 text-[10px] font-medium tabular-nums text-institutional-foreground">{unread}</span>
                  ) : null}
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-96 rounded-lg border bg-popover p-3 text-sm shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">Notifications</span>
                    <Link href="/notifications" className="text-xs underline">
                      all · preferences
                    </Link>
                  </div>
                  {recent.length === 0 ? (
                    <p className="text-muted-foreground">Nothing yet. Published packs matching your subscription will land here.</p>
                  ) : (
                    <ul className="space-y-2">
                      {recent.map((n) => (
                        <li key={n.id} className={cn("rounded-md border p-2", !n.read && "border-institutional/40 bg-institutional/5")}>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="uppercase">{n.kind.replace("_", " ")}</span>
                            <span>{fmtDate(n.at)}</span>
                          </div>
                          <Link href={`/audit?event=${n.eventId}`} className="mt-1 block hover:underline">
                            {n.summary}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            ) : null}
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} title="Switch role">
              <span className="font-mono text-xs">{username}</span>
              <span className="ml-1 rounded border border-line bg-muted px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{role}</span>
            </Link>
            {principal.kind === "user" ? (
              <form action={logoutAction}>
                <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {/* Calm locale banner — UI never machine-translated; Arabic RTL on this strip only. */}
        <div
          className="border-t border-line/70 bg-canvas px-6 py-1.5 text-xs text-muted-foreground"
          dir={treatyLang.code === "ar" ? "rtl" : "ltr"}
        >
          <div className="mx-auto max-w-6xl">
            UI strings: English (demo) · Treaty text: {treatyLang.label}
          </div>
        </div>
      </header>

      <AuditRibbon event={latest} />

      <div className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6">
          <nav aria-label="Journeys" className="flex flex-wrap items-center gap-5">
            {journeys.map((j) =>
              j.enabled ? (
                <Link key={j.href} href={j.href} className={journeyTab} title={j.caption}>
                  {j.label}
                </Link>
              ) : (
                <Link
                  key={j.href}
                  href={j.href}
                  className={cn(journeyTab, "text-muted-foreground hover:border-transparent hover:text-muted-foreground")}
                  title="ABMT is not available"
                >
                  {j.label}
                </Link>
              ),
            )}
          </nav>
          {title ? <p className="py-2 text-sm text-muted-foreground">{title}</p> : null}
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <FlashBanner flash={flash} />
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground">
          <span>BBNJ Cl-HM</span>
          <span>
            <Link href="/records/BBNJ-MGR-2026-00001" className="font-mono underline underline-offset-2 hover:text-institutional">
              /records/&lt;publicRecordId&gt;
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
