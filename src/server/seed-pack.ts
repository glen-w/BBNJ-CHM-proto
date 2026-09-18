/**
 * Plausible demo seed pack — loaded at runtime from
 * fixtures/bbnj-chm-seed-pack/csv/*.csv (prototype source of truth).
 * Idempotency keys use the `seed:csv:…` prefix. Not real Party filings.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { AbnjBox, ConfidentialityTier, Domain, EiaPublishableStages, SourceChannel, type ArtifactRef } from "@/lib/contracts/events";
import type { ConfidentialityTier as Confidentiality, SourceChannel as Channel } from "@/lib/contracts/events";
import { ResearchIfb, ResearchStatus } from "@/lib/contracts/extensions";
import type { Db } from "@/lib/db";
import type { TreatyCite } from "@/lib/treatyCites";

import { parseCsv } from "./parseCsv";

export type ProvenanceBadge = "Interim (DOALOS)" | "Demo scenario";

export const SEED_HONESTY =
  "Plausible demo data; not real Party filings. Interim mirrors cite DOALOS pages; operators and Party code XSD are fictional stand-ins.";

export type EiaCsvPack = {
  stage: (typeof EiaPublishableStages)[number];
  status: "published" | "pending";
  screeningOutcome?: "eia_required" | "no_eia";
  summary: string;
};

export type MgrCsvSeed = {
  seedKey: string;
  badge: ProvenanceBadge;
  title: string;
  locationHint: AbnjBox;
  objectives: string;
  methodMeans: string;
  expectedDates: string;
  sponsoringInstitution: string;
  participationOpportunities: string;
  dataManagementPlan: string;
  summary?: string;
  artifactRefs?: ArtifactRef[];
  at: string;
  publishAt: string;
  publish: boolean;
  postCollection: boolean;
  utilisation: boolean;
  sourceChannel: Channel;
  confidentiality: Confidentiality;
  tkFpicFlag: boolean;
};

export type EiaCsvSeed = {
  seedKey: string;
  badge: ProvenanceBadge;
  title: string;
  abnjBox: AbnjBox;
  zoteroKey?: string;
  artifact?: ArtifactRef;
  confidentiality: Confidentiality;
  packs: EiaCsvPack[];
  agreementExtras?: TreatyCite[];
  agreementFootnotes?: string[];
};

export type CbtmtNeedCsv = { seedKey: string; title: string; themes: string[] };
export type CbtmtOfferCsv = { seedKey: string; title: string; themes: string[]; provider: string };
export type CbtmtMatchCsv = {
  needSeedKey: string;
  offerSeedKey: string;
  rule: string;
  facilitationNote: string;
};

export type AbmtCsvSeed = {
  seedKey: string;
  badge: ProvenanceBadge;
  title: string;
  abnjBox: AbnjBox;
  publish: boolean;
  isaCaption: boolean;
};

export type ResearchCsvSeed = {
  seedKey: string;
  zoteroKey?: string;
  doi?: string;
  title: string;
  year?: number;
  citation?: string;
  oaUrl?: string;
  licence?: string;
  pillars: Domain[];
  geographies: AbnjBox[];
  ifbs: ResearchIfb[];
  summarySnippet?: string;
  status: ResearchStatus;
};

export type RelatedSystemLink = { label: string; href: string };
export type SecretariatNotice = { seedKey: string; title: string; url: string; summary: string };

export type LoadedSeedPack = {
  abnjBoxes: AbnjBox[];
  mgr: MgrCsvSeed[];
  eia: EiaCsvSeed[];
  cbtmtNeeds: CbtmtNeedCsv[];
  cbtmtOffers: CbtmtOfferCsv[];
  cbtmtMatches: CbtmtMatchCsv[];
  abmt: AbmtCsvSeed[];
  research: ResearchCsvSeed[];
  relatedSystems: RelatedSystemLink[];
  secretariatNotices: SecretariatNotice[];
  provenanceBySeedKey: Map<string, ProvenanceBadge>;
  titleBySeedKey: Map<string, string>;
};

/** Researcher overlay — mesopelagic RFMO-gap framing (not only artefact URL). */
const AGREEMENT_OVERLAY: Record<string, { extras: TreatyCite[]; footnotes: string[] }> = {
  "eia-mesopelagic-fishery": {
    extras: [
      { article: "Part IV", label: "EIA pathway — RFMO-gap framing (demo)" },
      { article: "Art 31", label: "Screening where activity sits outside clear single-RFMO stock measures" },
    ],
    footnotes: [
      "Zotero 6K6WPBFQ (Gjerde, Wright, Durussel 2021) — Strengthening high seas governance through enhanced environmental assessment processes: mesopelagic fisheries and options for a future BBNJ treaty. Cite as RFMO-gap / Part IV framing, not only as an artefact URL.",
    ],
  },
  "eia-cable-southern": {
    extras: [
      { article: "Art 34", label: "Decision with conditions on the same activity (demo)" },
      { article: "Arts 38–40", label: "Monitoring, reporting and review pack (demo)" },
    ],
    footnotes: [
      "Demo Part IV spine: screening → notice → draft EIA → decision → monitoring on one record. Not a real Party filing.",
    ],
  },
};

const MGR_RECEIVE_BASE = Date.parse("2026-08-12T09:00:00.000Z");

function mgrClock(idx: number, hours: number): string {
  return new Date(MGR_RECEIVE_BASE + idx * 36 * 3600_000 + hours * 3600_000).toISOString();
}

function asTier(raw: string | undefined): ConfidentialityTier {
  const parsed = ConfidentialityTier.safeParse(raw || "public");
  if (!parsed.success) throw new Error(`Seed pack confidentiality not in enum: ${raw}`);
  return parsed.data;
}

function asChannel(raw: string | undefined): SourceChannel {
  const parsed = SourceChannel.safeParse(raw || "form");
  if (!parsed.success) throw new Error(`Seed pack source_channel not in enum: ${raw}`);
  return parsed.data;
}

function asEiaStage(raw: string): EiaCsvPack["stage"] {
  if ((EiaPublishableStages as readonly string[]).includes(raw)) return raw as EiaCsvPack["stage"];
  throw new Error(`Seed pack EIA stage is not publishable in this build: ${raw}`);
}

let cached: LoadedSeedPack | undefined;

export function seedPackRoot(): string {
  if (process.env.SEED_PACK_DIR) return process.env.SEED_PACK_DIR;
  return join(process.cwd(), "fixtures", "bbnj-chm-seed-pack");
}

export function clearSeedPackCache(): void {
  cached = undefined;
}

function readCsv(name: string): Record<string, string>[] {
  const path = join(seedPackRoot(), "csv", name);
  if (!existsSync(path)) {
    throw new Error(
      `Seed pack CSV missing: ${path}. This prototype loads fixtures/bbnj-chm-seed-pack out of the box — check the checkout / Docker image.`,
    );
  }
  return parseCsv(readFileSync(path, "utf8"));
}

function asBadge(raw: string): ProvenanceBadge {
  if (raw === "Interim (DOALOS)" || raw === "Demo scenario") return raw;
  throw new Error(`Unknown provenance badge in seed pack: ${raw}`);
}

function splitSemi(raw: string): string[] {
  return raw
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}
const splitThemes = splitSemi;

function asAbnjBox(raw: string): AbnjBox {
  const parsed = AbnjBox.safeParse(raw);
  if (!parsed.success) throw new Error(`Seed pack abnj_box not in AbnjBox enum: ${raw}`);
  return parsed.data;
}

function asDomain(raw: string): Domain {
  const parsed = Domain.safeParse(raw);
  if (!parsed.success) throw new Error(`Seed pack pillar not in Domain enum: ${raw}`);
  return parsed.data;
}

function asIfb(raw: string): ResearchIfb {
  const parsed = ResearchIfb.safeParse(raw);
  if (!parsed.success) throw new Error(`Seed pack ifb not in ResearchIfb enum: ${raw}`);
  return parsed.data;
}

function asResearchStatus(raw: string): ResearchStatus {
  const parsed = ResearchStatus.safeParse(raw || "published");
  if (!parsed.success) throw new Error(`Seed pack research status invalid: ${raw}`);
  return parsed.data;
}

/** Load + memoize the fixture pack. Throws if CSVs are missing. */
export function getSeedPack(): LoadedSeedPack {
  if (cached) return cached;

  const provenanceBySeedKey = new Map<string, ProvenanceBadge>();
  for (const row of readCsv("provenance_badges.csv")) {
    provenanceBySeedKey.set(row.seed_key!, asBadge(row.badge!));
  }

  const abnjBoxes = readCsv("abnj_boxes.csv").map((r) => asAbnjBox(r.abnj_box!));

  const titleBySeedKey = new Map<string, string>();

  const mgr: MgrCsvSeed[] = readCsv("mgr_batches.csv").map((row, idx) => {
    const seedKey = row.seed_key!;
    const title = row.title!;
    titleBySeedKey.set(seedKey, title);
    const interimUrl = row.interim_url || row.data_management_plan || "";
    const hint = row.public_record_hint || "";
    const isInterim = provenanceBySeedKey.get(seedKey) === "Interim (DOALOS)";
    const objectives =
      isInterim && hint && !row.objectives!.includes(hint)
        ? `${row.objectives} Public record hint ${hint}.`
        : row.objectives!;
    const summary = isInterim
      ? `Pre-collection receipt mirroring interim ${hint || "BBNJ-MGR-TEMP"} (DOALOS); B-SBI minted on receipt — not the TEMP id.`
      : undefined;
    const artifactRefs: ArtifactRef[] | undefined = interimUrl
      ? [
          { kind: "url", label: `DOALOS interim — ${hint || "MGR TEMP"}`, href: interimUrl },
          { kind: "note", label: "Plausible demo mirror; not a real Party filing" },
        ]
      : undefined;
    const path = row.status_path ?? "";
    return {
      seedKey,
      badge: provenanceBySeedKey.get(seedKey) ?? "Demo scenario",
      title,
      locationHint: asAbnjBox(row.location_hint!),
      objectives,
      methodMeans: row.method_means!,
      expectedDates: row.expected_dates!,
      sponsoringInstitution: row.sponsoring_institution!,
      participationOpportunities: row.participation_opportunities!,
      dataManagementPlan: row.data_management_plan || interimUrl,
      summary,
      artifactRefs: isInterim ? artifactRefs : undefined,
      at: mgrClock(idx, 0),
      publishAt: mgrClock(idx, 2),
      publish: path.includes("publish"),
      postCollection: path.includes("post"),
      utilisation: path.includes("util"),
      sourceChannel: asChannel(row.source_channel),
      confidentiality: asTier(row.confidentiality),
      tkFpicFlag: /^(1|true|yes)$/i.test(row.tk_fpic ?? ""),
    };
  });

  const packsByActivity = new Map<string, EiaCsvPack[]>();
  for (const row of readCsv("eia_packs.csv")) {
    const key = row.activity_seed_key!;
    const list = packsByActivity.get(key) ?? [];
    const stage = asEiaStage(row.stage!);
    const status = row.status as EiaCsvPack["status"];
    const screeningOutcome = row.screening_outcome
      ? (row.screening_outcome as "eia_required" | "no_eia")
      : undefined;
    list.push({ stage, status, screeningOutcome, summary: row.summary! });
    packsByActivity.set(key, list);
  }

  const eia: EiaCsvSeed[] = readCsv("eia_activities.csv").map((row) => {
    const seedKey = row.seed_key!;
    const title = row.title!;
    titleBySeedKey.set(seedKey, title);
    const zoteroKey = row.zotero_key || undefined;
    const artifact: ArtifactRef | undefined =
      row.artifact_url && row.artifact_label
        ? {
            kind: "url",
            label: zoteroKey ? `${row.artifact_label} (Zotero ${zoteroKey})` : row.artifact_label,
            href: row.artifact_url,
          }
        : undefined;
    const overlay = AGREEMENT_OVERLAY[seedKey];
    return {
      seedKey,
      badge: provenanceBySeedKey.get(seedKey) ?? "Demo scenario",
      title,
      abnjBox: asAbnjBox(row.abnj_box!),
      zoteroKey,
      artifact,
      confidentiality: asTier(row.confidentiality),
      packs: packsByActivity.get(seedKey) ?? [],
      agreementExtras: overlay?.extras,
      agreementFootnotes: overlay?.footnotes,
    };
  });

  const cbtmtNeeds: CbtmtNeedCsv[] = readCsv("cbtmt_needs.csv").map((row) => {
    titleBySeedKey.set(row.seed_key!, row.title!);
    return { seedKey: row.seed_key!, title: row.title!, themes: splitThemes(row.themes!) };
  });

  const cbtmtOffers: CbtmtOfferCsv[] = readCsv("cbtmt_offers.csv").map((row) => {
    titleBySeedKey.set(row.seed_key!, row.title!);
    return {
      seedKey: row.seed_key!,
      title: row.title!,
      themes: splitThemes(row.themes!),
      provider: row.provider!,
    };
  });

  const cbtmtMatches: CbtmtMatchCsv[] = readCsv("cbtmt_matches.csv").map((row) => ({
    needSeedKey: row.need_seed_key!,
    offerSeedKey: row.offer_seed_key!,
    rule: row.rule!,
    facilitationNote: row.facilitation_note!,
  }));

  const abmt: AbmtCsvSeed[] = readCsv("abmt_proposals.csv").map((row) => {
    const seedKey = row.seed_key!;
    titleBySeedKey.set(seedKey, row.title!);
    const notes = (row.notes ?? "").toLowerCase();
    const path = row.status_path ?? "";
    return {
      seedKey,
      badge: provenanceBySeedKey.get(seedKey) ?? "Demo scenario",
      title: row.title!,
      abnjBox: asAbnjBox(row.abnj_box!),
      publish: path.includes("publish"),
      isaCaption: notes.includes("not-undermine") || seedKey === "abmt-ccz-precaution",
    };
  });

  const research: ResearchCsvSeed[] = readCsv("research_items.csv").map((row) => {
    const zoteroKey = row.zotero_key || undefined;
    const doi = row.doi || undefined;
    const title = row.title!;
    const seedKey = zoteroKey ? `research:${zoteroKey}` : doi ? `research:${doi}` : `research:${title}`;
    titleBySeedKey.set(seedKey, title);
    const yearRaw = row.year?.trim();
    const year = yearRaw ? Number(yearRaw) : undefined;
    if (yearRaw && !Number.isInteger(year)) throw new Error(`Seed pack research year is not an integer: ${row.year}`);
    return {
      seedKey,
      zoteroKey,
      doi,
      title,
      year,
      citation: row.citation || undefined,
      oaUrl: row.oa_url || undefined,
      licence: row.licence || undefined,
      pillars: splitSemi(row.pillars ?? "").map(asDomain),
      geographies: splitSemi(row.geographies ?? "").map(asAbnjBox),
      ifbs: splitSemi(row.ifbs ?? "").map(asIfb),
      summarySnippet: row.summary_snippet || undefined,
      status: asResearchStatus(row.status),
    };
  });

  const relatedSystems: RelatedSystemLink[] = readCsv("related_systems.csv").map((row) => ({
    label: row.label!,
    href: row.url!,
  }));

  const secretariatNotices: SecretariatNotice[] = readCsv("secretariat_notices.csv").map((row) => ({
    seedKey: row.seed_key!,
    title: row.title!,
    url: row.url!,
    summary: row.summary!,
  }));

  cached = {
    abnjBoxes,
    mgr,
    eia,
    cbtmtNeeds,
    cbtmtOffers,
    cbtmtMatches,
    abmt,
    research,
    relatedSystems,
    secretariatNotices,
    provenanceBySeedKey,
    titleBySeedKey,
  };
  return cached;
}

/** Boxes from abnj_boxes.csv (must match AbnjBox enum). */
export function SEED_ABNJ_BOXES(): AbnjBox[] {
  return [...getSeedPack().abnjBoxes];
}

/** @deprecated use getSeedPack().mgr — kept as getters for call sites */
export function MGR_CSV_SEEDS(): MgrCsvSeed[] {
  return getSeedPack().mgr;
}
export function EIA_CSV_SEEDS(): EiaCsvSeed[] {
  return getSeedPack().eia;
}
export function CBTMT_NEED_CSV(): CbtmtNeedCsv[] {
  return getSeedPack().cbtmtNeeds;
}
export function CBTMT_OFFER_CSV(): CbtmtOfferCsv[] {
  return getSeedPack().cbtmtOffers;
}
export function CBTMT_MATCH_CSV(): CbtmtMatchCsv[] {
  return getSeedPack().cbtmtMatches;
}
export function ABMT_CSV_SEEDS(): AbmtCsvSeed[] {
  return getSeedPack().abmt;
}
export function RESEARCH_CSV_SEEDS(): ResearchCsvSeed[] {
  return getSeedPack().research;
}
export function RELATED_SYSTEMS_SEED(): RelatedSystemLink[] {
  return getSeedPack().relatedSystems;
}
export function SECRETARIAT_NOTICES(): SecretariatNotice[] {
  return getSeedPack().secretariatNotices;
}

/** Resolve a CSV seed key from the first `seed:csv:…` idempotency key on a record. */
export function seedKeyForRecord(db: Db, recordId: string): string | undefined {
  const row = db
    .prepare(
      `SELECT idempotency_key AS k FROM events
       WHERE record_id = ? AND idempotency_key LIKE 'seed:csv:%'
       ORDER BY seq ASC LIMIT 1`,
    )
    .get(recordId) as { k: string } | undefined;
  if (!row?.k) return undefined;
  const full = row.k.slice("seed:csv:".length);
  const pack = getSeedPack();
  if (pack.provenanceBySeedKey.has(full) || pack.titleBySeedKey.has(full)) return full;
  // Pack stages append `-<stage>` (e.g. eia-rocket-splashdown-screening).
  for (const seedKey of pack.titleBySeedKey.keys()) {
    if (full === seedKey || full.startsWith(`${seedKey}-`)) return seedKey;
  }
  return full;
}

/** Provenance badge from the record's seed key — never fuzzy title matching. */
export function provenanceBadgeForRecord(db: Db, recordId: string): ProvenanceBadge | undefined {
  const seedKey = seedKeyForRecord(db, recordId);
  if (!seedKey) return undefined;
  return getSeedPack().provenanceBySeedKey.get(seedKey);
}

/** @deprecated Prefer provenanceBadgeForRecord — kept for call sites that only have a title. */
export function provenanceBadgeForTitle(title: string): ProvenanceBadge | undefined {
  const pack = getSeedPack();
  for (const [seedKey, badge] of pack.provenanceBySeedKey) {
    const seedTitle = pack.titleBySeedKey.get(seedKey);
    if (seedTitle && title === seedTitle) return badge;
  }
  if (title.includes("BBNJ-MGR-TEMP-2026-001")) return "Interim (DOALOS)";
  return undefined;
}

export function agreementBasisExtrasForRecord(db: Db, recordId: string): { extras: TreatyCite[]; footnotes: readonly string[] } {
  const seedKey = seedKeyForRecord(db, recordId);
  const row = seedKey ? getSeedPack().eia.find((e) => e.seedKey === seedKey) : undefined;
  return { extras: [...(row?.agreementExtras ?? [])], footnotes: row?.agreementFootnotes ?? [] };
}

/** @deprecated Prefer agreementBasisExtrasForRecord. */
export function agreementBasisExtrasForTitle(title: string): { extras: TreatyCite[]; footnotes: readonly string[] } {
  const row = getSeedPack().eia.find((e) => e.title === title);
  return { extras: [...(row?.agreementExtras ?? [])], footnotes: row?.agreementFootnotes ?? [] };
}

export function isIsaNotUndermineAbmtRecord(db: Db, recordId: string): boolean {
  const seedKey = seedKeyForRecord(db, recordId);
  if (!seedKey) return false;
  return getSeedPack().abmt.some((a) => a.seedKey === seedKey && a.isaCaption);
}

/** @deprecated Prefer isIsaNotUndermineAbmtRecord. */
export function isIsaNotUndermineAbmt(title: string): boolean {
  return getSeedPack().abmt.some((a) => a.isaCaption && a.title === title);
}

export function csvKey(seedKey: string): string {
  return `seed:csv:${seedKey}`;
}

/** Authored CSV pack counts — what the sandbox contains besides the smoke fixtures. */
export function csvStorylineCounts(): {
  mgr: number;
  eia: number;
  cbtmtNeeds: number;
  cbtmtOffers: number;
  cbtmtMatches: number;
  abmt: number;
  relatedSystems: number;
  abnjBoxes: number;
} {
  const pack = getSeedPack();
  return {
    mgr: pack.mgr.length,
    eia: pack.eia.length,
    cbtmtNeeds: pack.cbtmtNeeds.length,
    cbtmtOffers: pack.cbtmtOffers.length,
    cbtmtMatches: pack.cbtmtMatches.length,
    abmt: pack.abmt.length,
    relatedSystems: pack.relatedSystems.length,
    abnjBoxes: pack.abnjBoxes.length,
  };
}
