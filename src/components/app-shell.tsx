import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { AuditRibbon } from "@/components/audit-ribbon";
import { FlashBanner, type Flash } from "@/components/flash";
import { LanguageControl } from "@/components/language-control";
import { FocalPointsCaption } from "@/components/related-systems";
import { JourneysNav, RailsNav } from "@/components/shell-nav";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { TREATY_LANG_COOKIE, treatyLangOf } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions";
import { actorRoleOf, can } from "@/server/policy";
import { latestVisibleEvent, notificationsFor, unreadCount } from "@/server/queries";
import { getSessionUser } from "@/server/session";

// Journeys are entry points into the shared rails, not competing brands (VISUAL-CHARTER.md §1.2, §4).
const journeys: { href: string; label: string; caption: string; enabled: boolean }[] = [
  { href: "/mgr", label: "MGR", caption: "marine genetic resources", enabled: true },
  { href: "/eia", label: "EIA", caption: "environmental impact assessment", enabled: true },
  { href: "/capacity", label: "CBTMT", caption: "capacity-building & technology transfer", enabled: true },
  { href: "/abmt", label: "ABMT", caption: "area-based management tools (stub, without prejudice)", enabled: true },
];

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

  const railItems = [
    { href: "/audit", label: "Audit" },
    ...(principal.kind === "user" ? [{ href: "/notifications", label: "Notifications" }] : []),
    ...(can(principal, "comment_stb") ? [{ href: "/stb", label: "STB queue" }] : []),
  ];

  return (
    <div className="min-h-full flex flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        {/* Band 1 — UN masthead (welcome + treaty-text locale). */}
        <div className="border-b border-institutional/40 bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-1">
            <p className="text-xs text-muted-foreground">Welcome to the United Nations</p>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
              dir={treatyLang.code === "ar" ? "rtl" : "ltr"}
            >
              <FocalPointsCaption />
              <span aria-hidden="true" className="hidden sm:inline text-line">
                |
              </span>
              <span>UI: English · Treaty text: {treatyLang.label}</span>
              <LanguageControl active={treatyLang.code} />
            </div>
          </div>
        </div>

        {/* Band 2 — product mark · rails · global search · account. */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-x-3 px-6 py-2">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image src="/bbnj-emblem.svg" alt="" width={32} height={32} className="shrink-0" unoptimized />
            <span className="flex items-baseline gap-x-2">
              <span className="font-semibold tracking-tight text-institutional">BBNJ Cl-HM</span>
              <span className="hidden text-xs text-muted-foreground lg:inline">working desk</span>
            </span>
          </Link>
          <div className="ms-auto flex min-w-0 items-center gap-1.5">
            <RailsNav items={railItems} />
            <form action="/search" method="get" className="flex items-center gap-1.5" role="search">
              <Input
                name="q"
                type="search"
                placeholder="Search all Cl-HM records"
                aria-label="Search all Cl-HM records"
                className="h-8 w-44 sm:w-56"
              />
              <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Search
              </button>
            </form>
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
                <div className="absolute right-0 z-40 mt-2 w-96 rounded-lg border bg-popover p-3 text-sm shadow-md" role="region" aria-label="Notifications">
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
      </header>

      {/* Band 3 — journeys · last outbox event. */}
      <div className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-x-4 px-6">
          <JourneysNav items={journeys} />
          <div className="ms-auto min-w-0 max-w-md py-1">
            <AuditRibbon event={latest} />
          </div>
        </div>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-6 py-5 outline-none">
        {title ? <h1 className="sr-only">{title}</h1> : null}
        <FlashBanner flash={flash} />
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 text-xs text-muted-foreground">
          <span>BBNJ Cl-HM</span>
          <Link href="/#about-desk" className="underline underline-offset-2 hover:text-institutional">
            About this desk
          </Link>
        </div>
      </footer>
    </div>
  );
}
