import Link from "next/link";

import { FlashBanner, type Flash } from "@/components/flash";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions";
import { actorRoleOf, can } from "@/server/policy";
import { notificationsFor, unreadCount } from "@/server/queries";
import { getSessionUser } from "@/server/session";

const journeys = [
  { href: "/mgr", label: "MGR", enabled: true },
  { href: "/eia", label: "EIA", enabled: true },
  { href: "/capacity", label: "CBTMT", enabled: true },
  { href: "/abmt", label: "ABMT", enabled: false },
] as const;

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

  return (
    <div className="min-h-full flex flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              BBNJ Cl-HM prototype
            </Link>
            {title ? <p className="text-sm text-muted-foreground">{title}</p> : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {journeys.map((j) =>
              j.enabled ? (
                <Link key={j.href} href={j.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {j.label}
                </Link>
              ) : (
                <Link
                  key={j.href}
                  href={j.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "opacity-50")}
                  title="Not in this build — domain reserved in the contract (Art 51.3(a)(ii))"
                >
                  {j.label}
                </Link>
              ),
            )}
            {can(principal, "comment_stb") ? (
              <Link href="/stb" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                STB queue
              </Link>
            ) : null}
            <Link href="/audit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Audit
            </Link>
            <Link href="/compare" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              DOALOS contrast
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {principal.kind === "user" ? (
              <details className="relative">
                <summary className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer list-none")} title="Notifications (append-only outbox → bell)">
                  🔔 {unread > 0 ? <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unread}</span> : null}
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-96 rounded-lg border bg-popover p-3 text-sm shadow-lg">
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
                        <li key={n.id} className={cn("rounded-md border p-2", !n.read && "border-primary/40 bg-primary/5")}>
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
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} title="Switch sandbox login">
              <span className="font-mono text-xs">{username}</span>
              <span className="ml-1 rounded bg-muted px-1.5 text-[10px] uppercase">{role}</span>
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
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <FlashBanner flash={flash} />
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground">
          <span>Sandbox — demo Party code XSD (ISO user-assigned range), demo identifiers, no real submissions. MIT.</span>
          <span>
            <Link href="/records/BBNJ-MGR-2026-00001" className="underline">
              /records/&lt;publicRecordId&gt;
            </Link>{" "}
            · <Link href="/api/health" className="underline">health</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
