import { Bell, Search, Settings, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { DomainBadge } from "@/components/chips";
import { FlashBanner, type Flash } from "@/components/flash";
import { LanguageControl } from "@/components/language-control";
import { InstitutionalNav, JourneysNav, RailsNav } from "@/components/shell-nav";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { TREATY_LANG_COOKIE, treatyLangOf } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions";
import { actorRoleOf, can } from "@/server/policy";
import { notificationsFor, unreadCount } from "@/server/queries";
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
  const role = actorRoleOf(principal);
  const username = principal.kind === "user" ? principal.user.username : "anonymous";
  const store = await cookies();
  const treatyLang = treatyLangOf(store.get(TREATY_LANG_COOKIE)?.value);

  const railItems = [...(can(principal, "comment_stb") ? [{ href: "/stb", label: "STB queue" }] : [])];

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
              <LanguageControl active={treatyLang.code} />
            </div>
          </div>
        </div>

        {/* Band 2 — product mark · rails · account. */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-x-3 px-6 py-2">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image src="/bbnj-emblem.svg" alt="" width={36} height={36} className="shrink-0" unoptimized />
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-semibold tracking-tight text-institutional">Clearing House</span>
              <span className="text-sm text-muted-foreground">Biodiversity Beyond National Jurisdiction</span>
            </span>
          </Link>
          <div className="ms-auto flex shrink-0 flex-nowrap items-center gap-1.5">
            {railItems.length > 0 ? <RailsNav items={railItems} /> : null}
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 px-2")}
              title="Settings"
              aria-label="Settings"
            >
              <Settings aria-hidden="true" className="size-4" />
            </Link>
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
                            <span className="flex items-center gap-1.5 uppercase">
                              {n.domain ? <DomainBadge domain={n.domain} /> : null}
                              {n.kind.replace("_", " ")}
                            </span>
                            <span>{fmtDate(n.at)}</span>
                          </div>
                          {n.recordHref ? (
                            <Link href={n.recordHref} className="mt-1 block hover:underline">
                              {n.summary}
                            </Link>
                          ) : (
                            <span className="mt-1 block">{n.summary}</span>
                          )}
                          <Link href={`/audit?event=${n.eventId}`} className="mt-0.5 block text-xs text-muted-foreground hover:underline">
                            On the timeline
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            ) : null}
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "whitespace-nowrap")}
              title={principal.kind === "user" ? `Signed in as ${username} — switch role` : "Switch role"}
              aria-label={principal.kind === "user" ? `Signed in as ${username}, role ${role}. Switch role` : `Role ${role}. Switch role`}
            >
              <span className="inline-flex items-center gap-1 rounded border border-line bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                <User aria-hidden="true" className="size-3 shrink-0" />
                {role}
              </span>
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

      {/* Band 3 — desk tabs · journeys · search. */}
      <div className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-x-4 px-6">
          <InstitutionalNav />
          <JourneysNav items={journeys} />
          <form action="/search" method="get" className="ms-auto flex min-w-0 shrink-0 items-center gap-1.5 py-1.5" role="search">
            <Input
              name="q"
              type="search"
              placeholder="Search all Cl-HM records"
              aria-label="Search all Cl-HM records"
              className="h-8 w-44 sm:w-56"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "px-2")}
              aria-label="Search"
              title="Search"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-6 py-5 outline-none">
        {title ? <h1 className="sr-only">{title}</h1> : null}
        <FlashBanner flash={flash} />
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 text-xs text-muted-foreground">
          <span>Clearing House</span>
          <Link href="/about" className="underline underline-offset-2 hover:text-institutional">
            About this desk
          </Link>
        </div>
      </footer>
    </div>
  );
}
