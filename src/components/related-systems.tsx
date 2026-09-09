import { RELATED_SYSTEMS_SEED, SECRETARIAT_NOTICES } from "@/server/seed-pack";

/** Interim DOALOS focal-point surfaces — full list for the institutional page. */
export function SecretariatNoticesList() {
  const notices = SECRETARIAT_NOTICES();

  if (notices.length === 0) {
    return <p className="text-sm text-muted-foreground">No notices in this build.</p>;
  }

  return (
    <ul className="divide-y">
      {notices.map((notice) => (
        <li key={notice.seedKey} className="py-3 first:pt-0 last:pb-0">
          <a
            href={notice.url}
            rel="noopener noreferrer"
            target="_blank"
            className="font-medium text-foreground underline underline-offset-2 hover:text-institutional"
          >
            {notice.title}
          </a>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{notice.summary}</p>
        </li>
      ))}
    </ul>
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
