import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const journeys = [
  { href: "/mgr", label: "MGR", enabled: true },
  { href: "/eia", label: "EIA", enabled: true },
  { href: "/capacity", label: "CBTMT", enabled: true },
  { href: "/abmt", label: "ABMT", enabled: false },
] as const;

export function AppShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              BBNJ Cl-HM prototype
            </Link>
            {title ? (
              <p className="text-sm text-muted-foreground">{title}</p>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {journeys.map((journey) =>
              journey.enabled ? (
                <Link
                  key={journey.href}
                  href={journey.href}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  {journey.label}
                </Link>
              ) : (
                <span
                  key={journey.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "pointer-events-none opacity-50",
                  )}
                  title="Not in this build — domain reserved in schema"
                >
                  {journey.label}
                </span>
              ),
            )}
            <Link
              href="/compare"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              DOALOS compare
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
