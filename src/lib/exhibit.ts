/**
 * Printable evaluator exhibit — Session 1 / EOI criteria mapped to live routes.
 * Linked from About and Settings; not in primary nav (same posture as `/compare`).
 */

export type ExhibitStatus = "shipped" | "partial";

export type ExhibitRow = {
  area: string;
  status: ExhibitStatus;
  evidence: string;
  href: string;
  label: string;
};

export type ExhibitSection = {
  title: string;
  rows: ExhibitRow[];
};

export const EXHIBIT_AS_OF = "Session 1 basic functions + PrepCom3 annex parameters";

export const EXHIBIT_LIMITS = [
  "No hosted public URL — clone or Docker",
  "Notifications are in-app only (no SMTP)",
  "ABMT is a thin proposal_stub, without prejudice to COP1",
  "Excel loop is an Art 51.5 pattern, not a WCAG certificate",
  "Treaty-text locale stub only — UI stays English",
  "Related systems are named links, not federation",
] as const;

export const EXHIBIT_LOGINS = [
  { username: "party.nfp", role: "Party XSD NFP", does: "Submit MGR, EIA, CBTMT needs, ABMT stubs" },
  { username: "secretariat", role: "Authorised publisher", does: "Publish, import Excel, match, audit, digests" },
  { username: "public", role: "Public reader", does: "Published, public-tier only" },
  { username: "stb", role: "STB reviewer", does: "Published + restricted; draft-EIA queue" },
  { username: "nonstate.uploader", role: "Non-State provider", does: "CBTMT offers only" },
] as const;

export const EXHIBIT_SECTIONS: ExhibitSection[] = [
  {
    title: "1. Receipt, management and storage",
    rows: [
      {
        area: "Structured intake",
        status: "shipped",
        evidence: "Forms generated from Art 12.2 fields; EIA screening fields; ABMT one-field stub",
        href: "/mgr/new",
        label: "MGR form",
      },
      {
        area: "Offline / assisted (Art 51.5)",
        status: "shipped",
        evidence: "MGR + EIA screening Excel → import → error workbook → re-import; Secretariat-assisted channel on a seeded SIDS notice",
        href: "/mgr/import",
        label: "MGR import",
      },
      {
        area: "Identifiers (Art 12 B-SBI)",
        status: "shipped",
        evidence: "B-SBI at valid MGR receipt, before publish; publicRecordId at first publish; never swapped",
        href: "/mgr",
        label: "MGR list",
      },
      {
        area: "Versioning",
        status: "shipped",
        evidence: "Amend → pending v+1 with change note; material change re-notifies",
        href: "/mgr",
        label: "Versioned batch",
      },
      {
        area: "Search & retrieval",
        status: "shipped",
        evidence: "Policy-aware FTS5; Interim (DOALOS) vs Demo scenario badges",
        href: "/search?q=TEMP",
        label: "Search TEMP",
      },
      {
        area: "Confidentiality",
        status: "shipped",
        evidence: "public / restricted / confidential on every read path, including a high-latitude restricted MGR",
        href: "/login",
        label: "Switch role",
      },
      {
        area: "EIA spine",
        status: "shipped",
        evidence: "Screening → notice → draft → decision → monitoring on one Polar Front activity; packs coexist",
        href: "/eia",
        label: "EIA list",
      },
    ],
  },
  {
    title: "2. Making information publicly available, including notifications",
    rows: [
      {
        area: "Publication workflow",
        status: "shipped",
        evidence: "draft → pending → published on the pack; Secretariat publishes",
        href: "/login",
        label: "Sign in as secretariat",
      },
      {
        area: "Subscriptions & digest",
        status: "shipped",
        evidence: "Domain / ABNJ box / theme filters; immediate vs hold; on-demand digest CSV",
        href: "/preferences",
        label: "Preferences",
      },
      {
        area: "Delivery channel",
        status: "partial",
        evidence: "In-app bell + /notifications. No SMTP in this build.",
        href: "/notifications",
        label: "Bell / inbox",
      },
      {
        area: "CBTMT match + facilitation",
        status: "shipped",
        evidence: "Shared-theme join plus a human Secretariat note; unmatched needs/offers left unmatched on purpose",
        href: "/capacity",
        label: "Capacity board",
      },
    ],
  },
  {
    title: "3. User management",
    rows: [
      {
        area: "Five roles, server-enforced",
        status: "shipped",
        evidence: "Party / Secretariat / STB / public / non-State uploader; every refusal logged",
        href: "/audit",
        label: "Audit / refusals",
      },
      {
        area: "Account lifecycle",
        status: "partial",
        evidence: "Seeded users; inactive falls back to anonymous. No self-registration or IdP.",
        href: "/login",
        label: "Logins",
      },
    ],
  },
];

export const SEARCH_SUGGESTIONS: { q: string; why: string }[] = [
  { q: "TEMP", why: "Interim DOALOS MGR mirror" },
  { q: "utilisation", why: "Art 12.8 pack on the Indian Ridge cruise" },
  { q: "mesopelagic", why: "RFMO-gap EIA storyline" },
  { q: "sequencing", why: "SIDS CBTMT need / offer pair" },
  { q: "Sargasso", why: "Published ABMT stub (pending MGR when signed in as owner)" },
  { q: "Polar Front", why: "Observatory cable with decision + monitoring packs" },
];
