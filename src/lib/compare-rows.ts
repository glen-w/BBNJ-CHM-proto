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
      para: `Consolidated study ¶61: submission/publishing, search/retrieval, reporting/export. Interim column: what public DOALOS pages show (${asOf}), not what may exist behind them. This prototype receives structured records, validates them, versions them and exports them.`,
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
            { href: speedHref, label: `Speed tests (mocked links)${loginHint}` },
          ],
        },
        {
          area: "Identifiers",
          interim: `No Art 12 B-SBI issuance visible on public interim pages; documents identified by file name (${asOf})`,
          prototype: "internalId → receiptId (pending) → B-SBI at valid pre-collection receipt, before publish → publicRecordId at first publish. Stable /records/<id> URL.",
          links: [...(ctx.mgrA ? [{ href: `/mgr/${ctx.mgrA}`, label: "Batch DEMO-01" }] : []), { href: "/records/BBNJ-MGR-2026-00001", label: "/records/…" }],
        },
        {
          area: "Versioning",
          interim: `Documents appear replaced in place on public pages; no visible version chain (${asOf})`,
          prototype: "Published packs are amended as pending v+1 with a change note; material changes re-notify earlier readers; every version stays in the outbox.",
          links: ctx.mgrA ? [{ href: `/mgr/${ctx.mgrA}#versions`, label: "Version history (post-collection v1 → v2)" }] : [],
        },
        {
          area: "Confidentiality",
          interim: `Public pages only; no confidentiality tiering visible (${asOf})`,
          prototype: "public / restricted / confidential enforced in SQL for lists, counts, feeds, audit, exports and notifications; each page states who can see it. A separate proprietary category is deferred.",
          links: [...(ctx.mgrD ? [{ href: `/mgr/${ctx.mgrD}`, label: "Restricted batch (404 for public)" }] : []), { href: "/login", label: "Switch role" }],
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
          prototype: "CSV (RFC 4180) and JSON envelopes per domain, for the audit log and for digest runs; per-record JSON and a one-page PDF stub — all policy-filtered.",
          links: [
            { href: "/api/export/mgr.csv", label: "mgr.csv", external: true },
            { href: "/api/export/audit.json", label: "audit.json", external: true },
            { href: "/api/records/BBNJ-MGR-2026-00001.pdf", label: "record .pdf", external: true },
          ],
        },
        {
          area: "EIA spine",
          interim: `Documents as files on public pages (${asOf})`,
          prototype: "Pack-level publish spine: screening → notice → draft EIA → STB comments → decision. A published screening and a draft draft-EIA coexist on one activity.",
          links: [...(ctx.eia2 ? [{ href: `/eia/${ctx.eia2}`, label: "Sediment sampling, CCZ" }] : []), ...(ctx.eia3 ? [{ href: `/eia/${ctx.eia3}`, label: "Coexistence (activity 3)" }] : [])],
        },
        {
          area: "ABMT",
          interim: `Informational pages only on the public interim set-up (${asOf})`,
          prototype: "Thin proposal_stub journey on the same rails (draft → pending → published, receipt, BBNJ-ABMT id). Without prejudice to COP1; no content model.",
          links: [{ href: "/abmt", label: "ABMT stub" }, ...(ctx.abmt ? [{ href: `/abmt/${ctx.abmt}`, label: "Seeded proposal stub" }] : [])],
        },
      ],
    },
    {
      n: 2,
      title: "Notification and alerts",
      para: `PrepCom3 annex parameters: subscriptions, deadlines, digests. No subscription model is visible on public interim pages (${asOf}); the prototype fans every published outbox row out to owners, subscribers, reviewers — with cadence — into an in-app bell.`,
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
          prototype: "In-app bell only (no e-mail or push yet). Synchronous dispatch after commit; idempotent (UNIQUE user × event × kind); dispatch_log; replay inserts nothing on a consistent DB.",
          links: [{ href: "/notifications", label: "Bell / inbox" }, { href: "/audit", label: `Dispatch column${loginHint}` }],
        },
        {
          area: "Digests",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Daily/weekly subscribers are held back per event and receive one digest row per window, written to the bell; runnable on demand, idempotent, exportable.",
          links: [{ href: "/notifications", label: "Run digest (Secretariat)" }, { href: "/audit#digests", label: "Digest windows" }, { href: "/api/export/digests.csv", label: "digests.csv", external: true }],
        },
        {
          area: "Deadlines",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Publishing a draft EIA emits a deadline row (demo 30-day window, or the activity's explicit dueAt) to owner and subscribers, and an STB review request.",
          links: ctx.eia2 ? [{ href: `/eia/${ctx.eia2}`, label: "Draft EIA v1" }, { href: "/stb", label: "STB queue" }] : [{ href: "/stb", label: "STB queue" }],
        },
        {
          area: "Matches",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "CBTMT match = row + match_suggested event; both owners notified; deterministic shared-theme rule (not brokerage, not ML) plus a human facilitation note.",
          links: [{ href: "/capacity", label: "Capacity board" }, ...(ctx.need ? [{ href: `/capacity/${ctx.need}`, label: "Seeded need" }] : [])],
        },
      ],
    },
    {
      n: 3,
      title: "User management",
      para: `Role-based access, audit logging, account lifecycle. Public interim pages expose no role taxonomy (${asOf}); the prototype enforces five roles server-side and records every refusal.`,
      rows: [
        {
          area: "Roles",
          interim: `No role taxonomy visible on public interim pages; content appears Secretariat-published (${asOf})`,
          prototype: "Party / Secretariat (authorised publishing role) / STB / public / registered non-State uploader (CBTMT offers only); anonymous on any bad cookie; one can() and one SQL visibility clause for every read.",
          links: [{ href: "/login", label: "Sign in" }, { href: "/settings?tab=demo", label: "Demo user path" }],
        },
        {
          area: "Refusal audit",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Every denied action (publish as Party, import as public, reading a restricted record…) is an append-only refusal row in the Secretariat projection.",
          links: [{ href: "/audit#refusals", label: `Refusal log${loginHint}` }],
        },
        {
          area: "Audit trail",
          interim: `Not visible on public interim pages (${asOf})`,
          prototype: "Every receipt, transition and publication is an immutable outbox row; public and Secretariat projections of the same table.",
          links: [{ href: "/audit", label: "Audit" }, { href: "/api/export/audit.csv", label: "audit.csv", external: true }],
        },
        {
          area: "Sandbox lifecycle",
          interim: `Not applicable on the public interim informational pages (${asOf})`,
          prototype: "Reset in one click (env-gated) or `npm run db:reset`; seeds run through the same domain functions as the UI; `npm run smoke` proves the invariants.",
          links: [{ href: "/audit", label: "Reset database (SANDBOX_RESET=1)" }, { href: "/api/health", label: "Health", external: true }],
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
    prototype: "Subscriptions, in-app bell, digests, deadlines — semantics without SMTP",
    href: "/notifications",
  },
  {
    title: "User management",
    interim: `No role taxonomy visible on public pages (${INTERIM_AS_OF})`,
    prototype: "Five roles, server-enforced; every refusal logged",
    href: "/audit#refusals",
  },
];
