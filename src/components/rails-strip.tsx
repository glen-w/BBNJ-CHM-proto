import Link from "next/link";

import { RAIL_ICON } from "@/components/domain-icons";
import type { RailCounts } from "@/server/queries";

const RAILS: {
  key: keyof RailCounts;
  label: string;
  href: string;
  caption: string;
  icon: keyof typeof RAIL_ICON;
}[] = [
  { key: "submit", label: "Receive", href: "/mgr", caption: "records you can see", icon: "submit" },
  { key: "manage", label: "Manage", href: "/audit?status=pending", caption: "pending packs", icon: "manage" },
  { key: "publish", label: "Publish", href: "/audit?status=published", caption: "published rows", icon: "publish" },
  { key: "notify", label: "Notify", href: "/notifications", caption: "your notifications", icon: "notify" },
  { key: "audit", label: "Audit", href: "/audit", caption: "outbox rows visible to you", icon: "audit" },
];

export function RailsStrip({ counts }: { counts: RailCounts }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Workflow · counts for your role
      </h2>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {RAILS.map((r, i) => {
          const Icon = RAIL_ICON[r.icon];
          return (
            <li key={r.key} className="flex items-center gap-2">
              <Link
                href={r.href}
                className="flex-1 rounded-md border bg-background p-3 hover:border-institutional/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-institutional">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {r.label}
                </div>
                <div className="text-2xl font-semibold tabular-nums">{counts[r.key]}</div>
                <div className="text-xs text-muted-foreground">{r.caption}</div>
              </Link>
              {i < RAILS.length - 1 ? <span className="hidden text-muted-foreground sm:inline">→</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
