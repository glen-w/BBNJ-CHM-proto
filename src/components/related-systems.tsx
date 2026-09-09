import { cn } from "@/lib/utils";
import { RELATED_SYSTEMS_SEED, SECRETARIAT_NOTICES } from "@/server/seed-pack";

const FOCAL_POINT_SEED_KEYS = ["focal-points-list", "notif-2026-001"] as const;

/** Interim DOALOS focal-point surfaces — surfaced quietly in shell chrome. */
export function focalPointsInterimLinks(): { href: string; label: string; title: string }[] {
  const fromNotices = SECRETARIAT_NOTICES()
    .filter((n) => (FOCAL_POINT_SEED_KEYS as readonly string[]).includes(n.seedKey))
    .sort((a, b) => FOCAL_POINT_SEED_KEYS.indexOf(a.seedKey as (typeof FOCAL_POINT_SEED_KEYS)[number]) - FOCAL_POINT_SEED_KEYS.indexOf(b.seedKey as (typeof FOCAL_POINT_SEED_KEYS)[number]))
    .map((n) => ({
      href: n.url,
      label: n.seedKey === "notif-2026-001" ? "Notif 2026-001" : "Interim list",
      title: n.title,
    }));
  if (fromNotices.length > 0) return fromNotices;

  return RELATED_SYSTEMS_SEED()
    .filter((r) => r.href.includes("focal-points") || r.href.includes("notification-2026-001"))
    .map((r) => ({
      href: r.href,
      label: r.href.includes("notification-2026-001") ? "Notif 2026-001" : "Interim list",
      title: r.label,
    }));
}

/** One-line interim focal-point links — visible but not dominant. */
export function FocalPointsCaption({ className }: { className?: string }) {
  const links = focalPointsInterimLinks();
  if (links.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1 gap-y-0.5", className)}>
      <span>Focal points:</span>
      {links.map((link, i) => (
        <span key={link.href} className="inline-flex items-center gap-x-1">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          <a
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
            title={link.title}
            className="underline underline-offset-2 hover:text-institutional"
          >
            {link.label}
          </a>
        </span>
      ))}
    </span>
  );
}

/** Reference links only — no data flows. Seed pack related_systems.csv + BCH/OBIS. */
export function relatedSystemsLinks() {
  const fromPack = RELATED_SYSTEMS_SEED();
  const notices = SECRETARIAT_NOTICES().filter((n) => !fromPack.some((r) => r.href === n.url));
  return [
    ...fromPack.map((r) => ({ href: r.href, label: r.label })),
    ...notices.map((n) => ({ href: n.url, label: n.title })),
    { href: "https://bch.cbd.int/", label: "BCH" },
    { href: "https://obis.org/", label: "OBIS" },
  ];
}

export function RelatedSystemsList() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {relatedSystemsLinks().map((r) => (
        <li key={r.href}>
          <a href={r.href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
            {r.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
