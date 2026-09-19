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

const STAGE_ACRONYMS = new Set(["eia", "stb", "mgr", "abmt", "cbtmt"]);

/** Human stage name. Acronyms stay capitals (draft EIA, comments STB). */
export function stageLabel(stage: string): string {
  return stage
    .split("_")
    .map((word) => (STAGE_ACRONYMS.has(word) ? word.toUpperCase() : word))
    .join(" ");
}

export const DOMAIN_LABEL: Record<string, string> = {
  mgr: "MGR",
  eia: "EIA",
  cbtmt: "CBTMT",
  abmt: "ABMT",
};

const ROLE_LABEL: Record<string, string> = {
  party: "Party",
  public: "public",
  stb: "STB",
  secretariat: "Secretariat",
  publishing_authority: "authorised publisher",
  non_state_uploader: "non-State uploader",
};

/** Human actor-role name for chrome, login chips and audit rows. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? stageLabel(role);
}

const KIND_LABEL: Record<string, string> = {
  publish: "publish",
  deadline: "deadline",
  digest: "digest",
  match: "match",
  stb_review: "STB review",
};

/** Human notification-kind name (STB review, not stb_review). */
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? stageLabel(kind);
}

const ACTION_LABEL: Record<string, string> = {
  submit: "submit",
  publish: "publish",
  amend: "amend",
  comment_stb: "STB comment",
  import: "import",
  suggest_match: "suggest match",
  manage_subscription: "manage subscription",
  view_full_audit: "view full audit",
  export_full: "export",
  run_digest: "run digest",
  reset_sandbox: "reset database",
  read_record: "read record",
};

/** Human action name for the refusal log. */
export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? stageLabel(action);
}

const CADENCE_LABEL: Record<string, string> = {
  immediate: "Immediate",
  daily: "Daily",
  weekly: "Weekly",
};

export function cadenceLabel(cadence: string): string {
  return CADENCE_LABEL[cadence] ?? cadence;
}

export function domainPath(domain: string, recordId: string): string {
  switch (domain) {
    case "mgr":
      return `/mgr/${recordId}`;
    case "eia":
      return `/eia/${recordId}`;
    case "cbtmt":
      return `/capacity/${recordId}`;
    case "abmt":
      return `/abmt/${recordId}`;
    default:
      return "/abmt";
  }
}
