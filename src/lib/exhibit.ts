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
  "No public web address yet — run it from a copy of this Clearing House, or with Docker",
  "Notifications stay in the Clearing House (no e-mail / SMTP)",
  "Area-based management proposals are without prejudice to COP1. They record a title and follow publication; the full measure is for the Conference of the Parties",
  "The offline workbook is a way to submit without a reliable connection (Art 51.5). It is not an accessibility certificate",
  "The masthead can show the Agreement text in six languages. The interface is in English",
  "Related systems are links. This Clearing House does not exchange data with them",
  "The library lists open-access research and resources, with a citation and a link. It does not store the files",
] as const;

export const EXHIBIT_LOGINS = [
  { username: "party.nfp", role: "Party XSD focal point", does: "Submit MGR, EIA, capacity needs and ABMT proposals" },
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
        evidence: "Forms for Article 12.2 and for environmental impact screening. An area-based management proposal records a title and a confidentiality tier",
        href: "/mgr/new",
        label: "MGR form",
      },
      {
        area: "Offline / assisted (Art 51.5)",
        status: "shipped",
        evidence: "Excel for marine genetic resources and for screening: import, an error workbook, then import again. A small-island notice can be filed with Secretariat assistance",
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
        evidence: "Search respects confidentiality. Records are labelled Interim (DOALOS) or illustrative",
        href: "/search?q=TEMP",
        label: "Search TEMP",
      },
      {
        area: "Literature",
        status: "shipped",
        evidence: "Open-access research and resources, with a citation and a link. A paper shows on a record when the journey and the place match.",
        href: "/research",
        label: "Literature",
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
        evidence: "Notifications appear in the Clearing House. E-mail is not included.",
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
        evidence: "Five sign-in roles are provided for this review. There is no self-registration.",
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
  { q: "Sargasso", why: "Published area-based management proposal" },
  { q: "Polar Front", why: "Observatory cable with decision + monitoring packs" },
];
