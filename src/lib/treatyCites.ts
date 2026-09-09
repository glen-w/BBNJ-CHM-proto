/**
 * Short Agreement cites keyed by domain + stage.
 * Seed map beside stage enums — pack detail “Agreement basis” drawer only.
 */
import type { Domain } from "@/lib/contracts/events";

export type TreatyCite = { article: string; label: string };

const MGR: Record<string, TreatyCite[]> = {
  pre_collection: [{ article: "Art 12", label: "MGR receipt / B-SBI" }],
  batch_id_issued: [{ article: "Art 12", label: "MGR receipt / B-SBI" }],
  post_collection: [{ article: "Art 12.5", label: "Post-collection notification" }],
  utilisation: [{ article: "Art 12.8", label: "Utilisation notification" }],
};

const EIA: Record<string, TreatyCite[]> = {
  screening: [{ article: "Art 31", label: "Screening" }],
  planned_activity_notice: [{ article: "Art 32", label: "Notice of planned activity" }],
  scoping_notice: [{ article: "Art 33", label: "Scoping" }],
  draft_eia: [{ article: "Arts 33–34", label: "Draft EIA" }],
  comments_stb: [{ article: "Arts 34–35", label: "STB consolidated comments" }],
  decision_conditions: [{ article: "Arts 34/37", label: "Decision and conditions" }],
  monitoring_review: [{ article: "Arts 38–40", label: "Monitoring, reporting and review" }],
};

const CBTMT: TreatyCite[] = [{ article: "Art 51.3(b)", label: "Capacity-building and transfer of marine technology" }];

const ABMT: TreatyCite[] = [{ article: "Art 51.3(a)(ii)", label: "Area-based management tools (reserved)" }];

/** One-line caption for stage rails / selects (EIA). */
export function citeCaption(domain: Domain, stage: string): string {
  const cites = citesFor(domain, stage);
  if (cites.length === 0) return stage.replace(/_/g, " ");
  return cites.map((c) => `${c.article} — ${c.label}`).join("; ");
}

export function citesFor(domain: Domain, stage: string): TreatyCite[] {
  switch (domain) {
    case "mgr":
      return MGR[stage] ?? [{ article: "Art 12", label: "Marine genetic resources" }];
    case "eia":
      return EIA[stage] ?? [];
    case "cbtmt":
      return CBTMT;
    case "abmt":
      return ABMT;
    default:
      return [];
  }
}

/** Deduped cites for every stage present on a pack detail page. */
export function citesForPacks(domain: Domain, stages: string[]): TreatyCite[] {
  const list = stages.length > 0 ? stages : domain === "cbtmt" ? ["need_posted"] : domain === "abmt" ? ["proposal_stub"] : [];
  const seen = new Set<string>();
  const out: TreatyCite[] = [];
  for (const stage of list) {
    for (const c of citesFor(domain, stage)) {
      const key = `${c.article}|${c.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}
