import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const rails = [
  "Submit",
  "Manage",
  "Publish",
  "Notify",
  "Audit",
] as const;

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            One shared Cl-HM substrate
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Receipt → management → publication/notification → user roles —
            demonstrated through MGR, EIA, and CBTMT journeys. Transactional
            prototype contrasted with interim DOALOS static/informational Cl-HM.
          </p>
        </section>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Shared rails
          </h2>
          <ol className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {rails.map((rail, index) => (
              <li key={rail} className="flex items-center gap-2">
                <span className="rounded-md bg-muted px-3 py-1.5">{rail}</span>
                {index < rails.length - 1 ? (
                  <span className="text-muted-foreground">→</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-5">
            <h3 className="font-medium">MGR</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pre-collection receipt mints Art 12 B-SBI; first pack publish
              mints public record id.
            </p>
            <Link
              href="/mgr"
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              Open journey
            </Link>
          </div>
          <div className="rounded-lg border p-5">
            <h3 className="font-medium">EIA</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pack-level publish spine; STB queue on published draft EIA packs.
            </p>
            <Link
              href="/eia"
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              Open journey
            </Link>
          </div>
          <div className="rounded-lg border p-5">
            <h3 className="font-medium">CBTMT</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Needs, offers, and rule-based match rows — no ML.
            </p>
            <Link
              href="/capacity"
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              Open journey
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">ABMT</strong> is reserved in the
            domain enum but disabled in this build. The same receipt/publish
            record can later carry Art 51.3(a)(ii) ABMT packages.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
