export type CompareLink = { href: string; label: string; external?: boolean };
export type CompareRow = { area: string; interim: string; prototype: string; links: CompareLink[] };
export type CompareSection = { n: number; title: string; para: string; rows: CompareRow[] };

export type CompareContext = {
  mgrA?: string;
  mgrD?: string;
  eia2?: string;
  eia3?: string;
  need?: string;
  abmt?: string;
  secretariat: boolean;
};

/** Dated caveat for interim DOALOS cells — public pages only, not behind-login systems. */
export const INTERIM_AS_OF = "as of public DOALOS pages, Sep 2026";

export function buildCompareSections(ctx: CompareContext): CompareSection[] {
  const loginHint = ctx.secretariat ? "" : " (sign in as secretariat)";
  const speedHref = "/settings?tab=speed";
  const asOf = INTERIM_AS_OF;

  return [
    {
      n: 1,
      title: "Receipt, management and storage of information",
      para: `Submission, search and export, following paragraph 61 of the consolidated study. The interim column is what the public DOALOS pages show (${asOf}), not what may exist behind them. This Clearing House receives structured records, checks them, keeps versions and exports them.`,
      rows: [
        {
          area: "Intake",
          interim: `Informational pages and contact points; documents as files (${asOf})`,
          prototype: "Structured forms generated from one field definition (Art 12.2 a–j); offline .xlsx template with the same headers; Secretariat-assisted import",
          links: [
            { href: "/mgr/new", label: "MGR form" },
            { href: "/api/template/mgr.xlsx", label: "Template .xlsx", external: true },
            { href: "/mgr/import", label: "Import (Secretariat)" },
          ],
        },
        {
          area: "Offline / SIDS loop",
          interim: `No published offline path or validation feedback observed on public interim pages (${asOf})`,
          prototype: "Download → fill offline → import → per-row validation → error workbook pre-filled with failed rows → fix → re-import. Durable run record. Same loop for MGR and EIA screening.",
          links: [
            { href: "/mgr/import", label: "MGR import runs" },
            { href: "/eia/import", label: "EIA screening import" },
            { href: speedHref, label: `Connection estimates${loginHint}` },
          ],
        },
        {
          area: "Identifiers",
          interim: `No Art 12 B-SBI issuance visible on public interim pages; documents identified by file name (${asOf})`,
          prototype: "internalId → receiptId (pending) → B-SBI at valid pre-collection receipt, before publish → publicRecordId at first publish. Stable /records/<id> URL.",
          links: [...(ctx.mgrA ? [{ href: `/mgr/${ctx.mgrA}`, label: "Example batch" }] : []), { href: "/records/BBNJ-MGR-2026-00001", label: "Public record" }],
        },
        {
          area: "Versioning",
          interim: `Documents appear replaced in place on public pages; no visible version chain (${asOf})`,
          prototype: "A published record is amended as a new pending version with a change note. A material change notifies earlier readers. Every version is kept.",
          links: ctx.mgrA ? [{ href: `/mgr/${ctx.mgrA}#versions`, label: "Version history (post-collection v1 → v2)" }] : [],
        },
        {
          area: "Confidentiality",
          interim: `Public pages only; no confidentiality tiering visible (${asOf})`,
          prototype: "Public, restricted and confidential. Lists, search, exports and notifications follow the same rule, and each page states who can see it.",
          links: [...(ctx.mgrD ? [{ href: `/mgr/${ctx.mgrD}`, label: "Restricted record" }] : []), { href: "/login", label: "Switch role" }],
        },
        {
          area: "Search / retrieval",
          interim: `Browse / document pages (${asOf})`,
          prototype: "Role-filtered lists with search; stable record pages; version history; append-only timeline per record.",
          links: [{ href: "/mgr?q=CCZ", label: "Search MGR" }, { href: "/eia", label: "EIA list" }],
        },
        {
          area: "Reporting / export",
          interim: `Not offered on the public interim informational pages (${asOf})`,
          prototype: "CSV and JSON for each area, for the audit and for digests, plus a one-page PDF of a record. An export shows only what that reader may see.",
          links: [
            { href: "/api/export/mgr.csv", label: "mgr.csv", external: true },
            { href: "/api/export/audit.json", label: "audit.json", external: true },
            { href: "/api/records/BBNJ-MGR-2026-00001.pdf", label: "record .pdf", external: true },
          ],
        },
        {
          area: "EIA spine",
          interim: `Documents as files on public pages (${asOf})`,
          prototype: "Screening, notice, draft assessment, comments, decision and monitoring. A published screening can sit beside a draft assessment. The Polar Front cable carries a published decision and a monitoring report.",
          links: [...(ctx.eia2 ? [{ href: `/eia/${ctx.eia2}`, label: "Sediment sampling, CCZ" }] : []), ...(ctx.eia3 ? [{ href: `/eia/${ctx.eia3}`, label: "Coexistence (activity 3)" }] : [])],
        },
        {
          area: "ABMT",
          interim: `Informational pages only on the public interim set-up (${asOf})`,
          prototype: "Proposals move from draft to submitted to published, with a receipt and a public record id. Without prejudice to COP1. Title and confidentiality only — the full measure is for the Conference of the Parties.",
          links: [{ href: "/abmt", label: "ABMT proposals" }, ...(ctx.abmt ? [{ href: `/abmt/${ctx.abmt}`, label: "Example proposal" }] : [])],
        },
      ],
    },
    {
      n: 2,
      title: "Notification and alerts",
      para: `Subscriptions, deadlines and digests, following the PrepCom3 annex. Nothing like that is visible on the public interim pages (${asOf}). This Clearing House notifies owners, subscribers and reviewers inside the Clearing House, on the cadence they choose.`,
      rows: [
        {
          area: "Subscriptions",
          interim: `Not visible on public interim pages; contact points listed (${asOf})`,
          prototype: "Per-user filters by domain, ABNJ box and theme; cadence immediate / daily / weekly.",
          links: [{ href: "/preferences", label: "Preferences" }],
        },
        {
          area: "Delivery",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Notifications appear in the Clearing House. Each person receives a given notice once. E-mail is not included.",
          links: [{ href: "/notifications", label: "Bell / inbox" }, { href: "/audit", label: `Dispatch column${loginHint}` }],
        },
        {
          area: "Digests",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Daily and weekly subscribers receive one digest for each window. The Secretariat can run a digest on demand and export it.",
          links: [{ href: "/notifications", label: "Run digest (Secretariat)" }, { href: "/audit#digests", label: "Digest windows" }, { href: "/api/export/digests.csv", label: "digests.csv", external: true }],
        },
        {
          area: "Deadlines",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Publishing a draft assessment notifies the owner, subscribers and the Scientific and Technical Body. The comment window is 30 days unless the activity sets a date. The Agreement does not fix a number of days.",
          links: ctx.eia2 ? [{ href: `/eia/${ctx.eia2}`, label: "Draft EIA v1" }, { href: "/stb", label: "STB queue" }] : [{ href: "/stb", label: "STB queue" }],
        },
        {
          area: "Matches",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "A match joins a need and an offer that share a theme, and notifies both sides. It is not brokerage. The Secretariat can add a facilitation note.",
          links: [{ href: "/capacity", label: "Capacity board" }, ...(ctx.need ? [{ href: `/capacity/${ctx.need}`, label: "Example need" }] : [])],
        },
      ],
    },
    {
      n: 3,
      title: "User management",
      para: `Who may read, submit and publish, and a record of what was refused. The public interim pages show no such roles (${asOf}). This Clearing House has five roles, and records every refusal.`,
      rows: [
        {
          area: "Roles",
          interim: `No role taxonomy visible on public interim pages; content appears Secretariat-published (${asOf})`,
          prototype: "Party, Secretariat, Scientific and Technical Body, public reader, and a registered non-State provider who may post capacity-building offers. Someone who is not signed in sees only what the public may see.",
          links: [{ href: "/login", label: "Sign in" }, { href: "/settings?tab=demo", label: "Guided path" }],
        },
        {
          area: "Refusal audit",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "A denied action — publishing as a Party, importing as the public, opening a restricted record — is kept in the audit for the Secretariat.",
          links: [{ href: "/audit#refusals", label: `Refusal log${loginHint}` }],
        },
        {
          area: "Audit trail",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Every receipt, change and publication is kept. The public sees published, public records. The Secretariat sees the full audit.",
          links: [{ href: "/audit", label: "Audit" }, { href: "/api/export/audit.csv", label: "audit.csv", external: true }],
        },
        {
          area: "Restore illustrative records",
          interim: `Not applicable on the public interim informational pages (${asOf})`,
          prototype: "The Secretariat can restore the illustrative records from the audit page, when that action is enabled.",
          links: [{ href: "/audit", label: "Audit" }, { href: "/api/health", label: "Health", external: true }],
        },
      ],
    },
  ];
}

/** Condensed rows for the About page — one headline row per Session-1 function. */
export const ABOUT_COMPARE_HIGHLIGHTS: { title: string; interim: string; prototype: string; href: string }[] = [
  {
    title: "Receipt & storage",
    interim: `Documents and contact points (${INTERIM_AS_OF})`,
    prototype: "Forms + offline Excel + validation + versioning + policy-filtered export",
    href: "/compare",
  },
  {
    title: "Notify & alerts",
    interim: `Not visible on public interim pages (${INTERIM_AS_OF})`,
    prototype: "Subscriptions, notifications in the Clearing House, digests and deadlines",
    href: "/notifications",
  },
  {
    title: "User management",
    interim: `No role taxonomy visible on public pages (${INTERIM_AS_OF})`,
    prototype: "Five roles, server-enforced; every refusal logged",
    href: "/audit#refusals",
  },
];
