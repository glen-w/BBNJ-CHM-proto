/**
 * Plausible demo seed pack — typed constants transpiled from
 * fixtures/bbnj-chm-seed-pack/csv/*.csv. Not real Party filings.
 * Idempotency keys use the `seed:csv:…` prefix.
 */
import type { AbnjBox, ArtifactRef } from "@/lib/contracts/events";
import type { TreatyCite } from "@/lib/treatyCites";

export type ProvenanceBadge = "Interim (DOALOS)" | "Demo scenario";

export const SEED_HONESTY =
  "Plausible demo data; not real Party filings. Interim mirrors cite DOALOS pages; operators and Party code XSD are fictional stand-ins.";

/** Extended ABNJ boxes from abnj_boxes.csv (union with the Zod enum). */
export const SEED_ABNJ_BOXES = [
  "CCZ",
  "Reykjanes Ridge",
  "Clarion-Clipperton South",
  "Mid-Atlantic Splashdown Corridor",
  "NE Atlantic Mesopelagic Belt",
  "North Atlantic OAE Trial Box",
  "Sargasso Sea Core",
  "Costa Rica Thermal Dome",
] as const satisfies ReadonlyArray<AbnjBox>;

export const RELATED_SYSTEMS_SEED = [
  { label: "MGR TEMP-2026-001 (interim)", href: "https://www.un.org/bbnjagreement/en/mgr-notifications/bbnj-mgr-temp-2026-001" },
  { label: "CBTMT information-sharing (interim)", href: "https://www.un.org/bbnjagreement/en/Information-sharing/CBTMT" },
  { label: "Focal points (interim)", href: "https://www.un.org/bbnjagreement/en/focal-points-formal-communications" },
  { label: "Notification 2026-001", href: "https://www.un.org/bbnjagreement/en/notification-2026-001" },
  { label: "ABSCH", href: "https://absch.cbd.int/" },
] as const;

export const SECRETARIAT_NOTICES = [
  {
    seedKey: "notif-2026-001",
    title: "Notification 2026-001 — Focal points for formal communications",
    url: "https://www.un.org/bbnjagreement/en/notification-2026-001",
    summary:
      "DOALOS interim secretariat invites Parties to designate focal points via note verbale + online form; until Cl-HM operational, use doalos@un.org.",
  },
  {
    seedKey: "focal-points-list",
    title: "Focal points — formal communications (interim list page)",
    url: "https://www.un.org/bbnjagreement/en/focal-points-formal-communications",
    summary: "Interim page listing designated focal points for formal communications under the Agreement.",
  },
] as const;

const INTERIM_MGR_URL = "https://www.un.org/bbnjagreement/en/mgr-notifications/bbnj-mgr-temp-2026-001";

export const MGR_CSV_SEEDS = [
  {
    seedKey: "mgr-interim-temp-001",
    badge: "Interim (DOALOS)" as ProvenanceBadge,
    title: "Interim DOALOS MGR notification — BBNJ-MGR-TEMP-2026-001 (mirrored)",
    locationHint: "Clarion-Clipperton South" as const,
    objectives: "Mirror of interim UN MGR temporary notification for demo continuity with DOALOS site. Public record hint BBNJ-MGR-TEMP-2026-001.",
    methodMeans: "As recorded on interim site (demo paraphrase) — research vessel sampling in ABNJ.",
    expectedDates: "2026",
    sponsoringInstitution: "As designated on interim notification (demo Party XSD stand-in)",
    participationOpportunities: "See interim page; demo flags capacity participation interest.",
    dataManagementPlan: INTERIM_MGR_URL,
    summary:
      "Pre-collection receipt mirroring interim BBNJ-MGR-TEMP-2026-001 (DOALOS); B-SBI minted on receipt — not the TEMP id.",
    artifactRefs: [
      { kind: "url" as const, label: "DOALOS interim — BBNJ-MGR-TEMP-2026-001", href: INTERIM_MGR_URL },
      { kind: "note" as const, label: "Plausible demo mirror; not a real Party filing" },
    ] satisfies ArtifactRef[],
    at: "2026-09-06T09:00:00.000Z",
    publishAt: "2026-09-06T10:00:00.000Z",
    postCollection: false,
  },
  {
    seedKey: "mgr-genomics-pacific",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Mesopelagic eDNA & MGR collection — Pacific transect DEMO",
    locationHint: "Clarion-Clipperton South" as const,
    objectives: "Collect water-column eDNA and limited tissue vouchers for taxonomy training datasets.",
    methodMeans: "CTD-rosette, MOCNESS, sterile filtration; no commercial harvest.",
    expectedDates: "2026-10 to 2026-11",
    sponsoringInstitution: "Demo Institute of Marine Science",
    participationOpportunities: "Two berths + shared sequence data for developing-State scientists",
    dataManagementPlan: "https://example.org/dmp/mgr-genomics-pacific",
    summary: undefined as string | undefined,
    artifactRefs: undefined as ArtifactRef[] | undefined,
    at: "2026-09-06T11:00:00.000Z",
    publishAt: "2026-09-06T12:00:00.000Z",
    postCollection: true,
  },
] as const;

export type EiaCsvPack = {
  stage: "screening" | "planned_activity_notice" | "draft_eia";
  status: "published" | "pending";
  screeningOutcome?: "eia_required" | "no_eia";
  summary: string;
};

export const EIA_CSV_SEEDS = [
  {
    seedKey: "eia-rocket-splashdown",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Controlled re-entry / splashdown corridor — Mid-Atlantic ABNJ",
    abnjBox: "Mid-Atlantic Splashdown Corridor" as AbnjBox,
    zoteroKey: "U7EHXJMV",
    artifact: {
      kind: "url" as const,
      label: "Literature note — De Lucia & Guo 2026 (Zotero U7EHXJMV)",
      href: "https://doi.org/10.1163/15718085-20261023",
    } satisfies ArtifactRef,
    packs: [
      {
        stage: "screening",
        status: "published",
        screeningOutcome: "eia_required",
        summary: "Art 31 screening — EIA required for controlled re-entry splashdown corridor",
      },
      {
        stage: "planned_activity_notice",
        status: "published",
        summary: "Art 32 planned activity notice — splashdown corridor coordinates & schedule envelope",
      },
      {
        stage: "draft_eia",
        status: "published",
        summary: "Draft EIA for STB/public consultation — noise, debris, wildlife strike, cumulative launch cadence",
      },
    ] satisfies EiaCsvPack[],
    agreementExtras: undefined as TreatyCite[] | undefined,
    agreementFootnotes: undefined as string[] | undefined,
  },
  {
    seedKey: "eia-marine-cdr-oae",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Ocean alkalinity enhancement pilot — North Atlantic trial box",
    abnjBox: "North Atlantic OAE Trial Box" as AbnjBox,
    zoteroKey: "TU7WCKWE",
    artifact: {
      kind: "url" as const,
      label: "Literature note — Burns & Webb 2026 (Zotero TU7WCKWE)",
      href: "https://doi.org/10.1163/22116001-04001-009",
    } satisfies ArtifactRef,
    packs: [
      {
        stage: "screening",
        status: "published",
        screeningOutcome: "eia_required",
        summary: "Art 31 screening — mCDR OAE pilot requires EIA",
      },
      {
        stage: "planned_activity_notice",
        status: "published",
        summary: "Art 32 notice — alkalinity enhancement trial box",
      },
      {
        stage: "draft_eia",
        status: "pending",
        summary: "Draft EIA pending Secretariat publish — monitoring & cumulative mCDR interactions",
      },
    ] satisfies EiaCsvPack[],
    agreementExtras: undefined as TreatyCite[] | undefined,
    agreementFootnotes: undefined as string[] | undefined,
  },
  {
    seedKey: "eia-mesopelagic-fishery",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Exploratory mesopelagic trawl fishery — NE Atlantic high seas",
    abnjBox: "NE Atlantic Mesopelagic Belt" as AbnjBox,
    zoteroKey: "6K6WPBFQ",
    artifact: {
      kind: "url" as const,
      label: "IASS report — Gjerde, Wright, Durussel 2021 (Zotero 6K6WPBFQ)",
      href: "https://doi.org/10.48440/IASS.2021.001",
    } satisfies ArtifactRef,
    packs: [
      {
        stage: "screening",
        status: "published",
        screeningOutcome: "eia_required",
        summary: "Art 31 screening — exploratory mesopelagic fishery requires EIA",
      },
    ] satisfies EiaCsvPack[],
    agreementExtras: [
      { article: "Part IV", label: "EIA pathway — RFMO-gap framing (demo)" },
      { article: "Art 31", label: "Screening where activity sits outside clear single-RFMO stock measures" },
    ] as TreatyCite[],
    agreementFootnotes: [
      "Zotero 6K6WPBFQ (Gjerde, Wright, Durussel 2021) — Strengthening high seas governance through enhanced environmental assessment processes: mesopelagic fisheries and options for a future BBNJ treaty. Cite as RFMO-gap / Part IV framing, not only as an artefact URL.",
    ],
  },
  {
    seedKey: "eia-no-eia-buoy",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Short-term research buoy deployment — Reykjanes Ridge",
    abnjBox: "Reykjanes Ridge" as AbnjBox,
    zoteroKey: undefined as string | undefined,
    artifact: undefined as ArtifactRef | undefined,
    packs: [
      {
        stage: "screening",
        status: "published",
        screeningOutcome: "no_eia",
        summary: "Art 31 — no EIA required (sufficiently detailed screening pack)",
      },
    ] satisfies EiaCsvPack[],
    agreementExtras: undefined as TreatyCite[] | undefined,
    agreementFootnotes: undefined as string[] | undefined,
  },
] as const;

export const CBTMT_NEED_CSV = [
  {
    seedKey: "cbt-need-eia-practice",
    title: "EIA practice training for ABNJ activities (SIDS cohort)",
    themes: ["eia_practice", "training"],
  },
  {
    seedKey: "cbt-need-meso-assessment",
    title: "Support for mesopelagic impact assessment methods",
    themes: ["eia_practice", "fisheries", "mesopelagic"],
  },
  {
    seedKey: "cbt-need-mcdr-monitor",
    title: "mCDR monitoring & verification capacity",
    themes: ["mcdr", "monitoring", "genomics"],
  },
] as const;

export const CBTMT_OFFER_CSV = [
  {
    seedKey: "cbt-offer-eia-course",
    title: "Short course: BBNJ Part IV EIA workflow & CHM packs",
    themes: ["eia_practice", "training"],
    provider: "Demo Regional Training Centre",
  },
  {
    seedKey: "cbt-offer-acoustic",
    title: "Acoustic & trawl survey design mentoring for mesopelagic trials",
    themes: ["fisheries", "mesopelagic", "eia_practice"],
    provider: "Demo Ocean Acoustics Lab",
  },
  {
    seedKey: "cbt-offer-oae-lab",
    title: "Lab & shipboard alkalinity measurement protocols (open materials)",
    themes: ["mcdr", "monitoring"],
    provider: "Demo Biogeochemistry Consortium",
  },
] as const;

export const CBTMT_MATCH_CSV = [
  {
    needSeedKey: "cbt-need-eia-practice",
    offerSeedKey: "cbt-offer-eia-course",
    rule: "eia_practice",
    facilitationNote: "Secretariat facilitation note (demo): cohort scheduling offered Q1 2027.",
  },
  {
    needSeedKey: "cbt-need-meso-assessment",
    offerSeedKey: "cbt-offer-acoustic",
    rule: "mesopelagic",
    facilitationNote: "Human brokerage (demo): match suggested on shared mesopelagic/eia_practice themes.",
  },
] as const;

export const ABMT_CSV_SEEDS = [
  {
    seedKey: "abmt-sargasso",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Sargasso Sea Core — high seas MPA candidate (demo)",
    abnjBox: "Sargasso Sea Core" as AbnjBox,
    publish: true,
    isaCaption: false,
  },
  {
    seedKey: "abmt-cr-dome",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "Costa Rica Thermal Dome — ABMT candidate (demo)",
    abnjBox: "Costa Rica Thermal Dome" as AbnjBox,
    publish: false,
    isaCaption: false,
  },
  {
    seedKey: "abmt-ccz-precaution",
    badge: "Demo scenario" as ProvenanceBadge,
    title: "CCZ representative habitats — precautionary ABMT network node (demo)",
    abnjBox: "CCZ" as AbnjBox,
    publish: true,
    isaCaption: true,
  },
] as const;

/** Title → provenance badge for list chips (Interim vs Demo). */
const TITLE_BADGE: Array<{ match: string; badge: ProvenanceBadge }> = [
  { match: "BBNJ-MGR-TEMP-2026-001", badge: "Interim (DOALOS)" },
  { match: "Mesopelagic eDNA & MGR collection", badge: "Demo scenario" },
  { match: "Controlled re-entry / splashdown", badge: "Demo scenario" },
  { match: "Ocean alkalinity enhancement pilot", badge: "Demo scenario" },
  { match: "Exploratory mesopelagic trawl", badge: "Demo scenario" },
  { match: "Short-term research buoy deployment", badge: "Demo scenario" },
  { match: "Sargasso Sea Core — high seas MPA", badge: "Demo scenario" },
  { match: "Costa Rica Thermal Dome — ABMT", badge: "Demo scenario" },
  { match: "CCZ representative habitats", badge: "Demo scenario" },
];

export function provenanceBadgeForTitle(title: string): ProvenanceBadge | undefined {
  const hit = TITLE_BADGE.find((t) => title.includes(t.match));
  return hit?.badge;
}

/** Extra Agreement-basis cites / footnotes for specific EIA storylines (by title). */
export function agreementBasisExtrasForTitle(title: string): { extras: TreatyCite[]; footnotes: readonly string[] } {
  const row = EIA_CSV_SEEDS.find((e) => title.includes(e.title.slice(0, 40)) || title === e.title);
  return { extras: [...(row?.agreementExtras ?? [])], footnotes: row?.agreementFootnotes ?? [] };
}

export function isIsaNotUndermineAbmt(title: string): boolean {
  return ABMT_CSV_SEEDS.some((a) => a.isaCaption && title.includes("CCZ representative habitats"));
}

export function csvKey(seedKey: string): string {
  return `seed:csv:${seedKey}`;
}
