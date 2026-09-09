export function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
}

/** Compact relative time for the audit ribbon (server-rendered at request time). */
export function fmtRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "just now";
  if (sec < 90) return "1 min ago";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 5400) return "1 hr ago";
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 172800) return "1 day ago";
  return `${Math.floor(sec / 86400)} days ago`;
}

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

export const DOMAIN_LABEL: Record<string, string> = {
  mgr: "MGR",
  eia: "EIA",
  cbtmt: "CBTMT",
  abmt: "ABMT",
};

export function domainPath(domain: string, recordId: string): string {
  switch (domain) {
    case "mgr":
      return `/mgr/${recordId}`;
    case "eia":
      return `/eia/${recordId}`;
    case "cbtmt":
      return `/capacity/${recordId}`;
    default:
      return "/abmt";
  }
}
