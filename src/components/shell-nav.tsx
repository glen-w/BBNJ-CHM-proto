"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const railLink =
  "whitespace-nowrap rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const railLinkCurrent = "bg-muted text-foreground";
const journeyTab =
  "inline-flex items-center gap-1.5 border-b-2 border-transparent px-1 py-2 text-sm font-medium text-foreground/85 hover:border-line hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const journeyTabCurrent = "border-institutional text-foreground";

function pathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RailsNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Rails" className="flex shrink-0 flex-nowrap items-center gap-1">
      {items.map((item) => {
        const current = pathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(railLink, current && railLinkCurrent)}
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function InstitutionalNav() {
  const pathname = usePathname();
  const allCurrent = pathActive(pathname, "/audit");
  const institutionalCurrent = pathActive(pathname, "/institutional");
  return (
    <nav aria-label="Desk" className="flex shrink-0 items-center gap-5 border-r border-line pe-4">
      <Link
        href="/audit"
        className={cn(journeyTab, allCurrent && journeyTabCurrent)}
        title="All transactions visible to your role"
        aria-current={allCurrent ? "page" : undefined}
      >
        All
      </Link>
      <Link
        href="/institutional"
        className={cn(journeyTab, institutionalCurrent && journeyTabCurrent)}
        title="Focal points, notices and related systems"
        aria-current={institutionalCurrent ? "page" : undefined}
      >
        Institutional
      </Link>
    </nav>
  );
}

export function JourneysNav({
  items,
}: {
  items: { href: string; label: string; caption: string; enabled: boolean }[];
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Journeys" className="flex flex-wrap items-center gap-5">
      {items.map((j) => {
        const current = pathActive(pathname, j.href);
        if (!j.enabled) {
          return (
            <span
              key={j.href}
              className={cn(journeyTab, "cursor-not-allowed text-muted-foreground hover:border-transparent")}
              title={j.caption || "Not available"}
              aria-disabled="true"
            >
              {j.label}
            </span>
          );
        }
        return (
          <Link
            key={j.href}
            href={j.href}
            className={cn(journeyTab, current && journeyTabCurrent)}
            title={j.caption}
            aria-current={current ? "page" : undefined}
          >
            {j.label}
          </Link>
        );
      })}
    </nav>
  );
}
