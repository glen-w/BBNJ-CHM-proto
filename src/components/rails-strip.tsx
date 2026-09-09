import Link from "next/link";

import type { RailCounts } from "@/server/queries";

const RAILS: { key: keyof RailCounts; label: string; href: string; caption: string }[] = [
  { key: "submit", label: "Receive", href: "/mgr", caption: "records you can see" },
  { key: "manage", label: "Manage", href: "/audit?status=pending", caption: "pending packs" },
  { key: "publish", label: "Publish", href: "/audit?status=published", caption: "published rows" },
  { key: "notify", label: "Notify", href: "/notifications", caption: "your notifications" },
  { key: "audit", label: "Audit", href: "/audit", caption: "outbox rows visible to you" },
];

export function RailsStrip({ counts }: { counts: RailCounts }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        One substrate · five rails · counts filtered by your role
      </h2>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {RAILS.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2">
            <Link href={r.href} className="flex-1 rounded-md border bg-background p-3 hover:bg-muted">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="text-2xl font-semibold tabular-nums">{counts[r.key]}</div>
              <div className="text-xs text-muted-foreground">{r.caption}</div>
            </Link>
            {i < RAILS.length - 1 ? <span className="hidden text-muted-foreground sm:inline">→</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
