export function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
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
