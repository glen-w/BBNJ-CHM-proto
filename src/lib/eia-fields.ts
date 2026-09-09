/**
 * EIA screening Excel field definitions — one source for template headers,
 * import validation and the field guide (Art 51.5 offline pattern beyond MGR).
 */
import { z } from "zod";

import { AbnjBox, ConfidentialityTier } from "@/lib/contracts/events";

export const EIA_SCREENING_TEMPLATE_NAME = "bbnj-chm-eia-screening";
export const EIA_SCREENING_TEMPLATE_VERSION = 1;

export type EiaScreeningFieldDef = {
  key: string;
  excelHeader: string;
  required: boolean;
  kind: "text" | "enum";
  basis: string;
  help: string;
  options?: string[];
};

export const EIA_SCREENING_FIELDS: EiaScreeningFieldDef[] = [
  {
    key: "title",
    excelHeader: "title",
    required: true,
    kind: "text",
    basis: "Art 31 screening — activity title",
    help: "Short title of the planned activity in ABNJ.",
  },
  {
    key: "abnjBox",
    excelHeader: "abnj_box",
    required: true,
    kind: "enum",
    basis: "Demo ABNJ box vocabulary (not GIS)",
    help: "One of the fixed demo boxes.",
    options: [...AbnjBox.options],
  },
  {
    key: "partyCode",
    excelHeader: "party_code",
    required: true,
    kind: "text",
    basis: "Submitting Party code (2–3 letters)",
    help: "ISO-style demo Party code (e.g. XSD).",
  },
  {
    key: "screeningOutcome",
    excelHeader: "screening_outcome",
    required: true,
    kind: "enum",
    basis: "Art 31 — published screening requires outcome",
    help: "eia_required or no_eia.",
    options: ["eia_required", "no_eia"],
  },
  {
    key: "confidentiality",
    excelHeader: "confidentiality",
    required: true,
    kind: "enum",
    basis: "PrepCom3 annex confidentiality categories",
    help: "public | restricted | confidential. A separate proprietary category is deferred.",
    options: [...ConfidentialityTier.options],
  },
];

export function normaliseEiaHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export const EiaScreeningInput = z.object({
  title: z.string().min(1),
  abnjBox: AbnjBox,
  partyCode: z.string().regex(/^[A-Z]{2,3}$/),
  screeningOutcome: z.enum(["eia_required", "no_eia"]),
  confidentiality: ConfidentialityTier.default("public"),
});
export type EiaScreeningInput = z.infer<typeof EiaScreeningInput>;

export function coerceEiaScreeningInput(raw: Record<string, string>): EiaScreeningInput {
  return EiaScreeningInput.parse({
    title: (raw.title ?? "").trim(),
    abnjBox: (raw.abnjBox ?? raw.abnj_box ?? "").trim(),
    partyCode: (raw.partyCode ?? raw.party_code ?? "").trim().toUpperCase(),
    screeningOutcome: (raw.screeningOutcome ?? raw.screening_outcome ?? "").trim().toLowerCase(),
    confidentiality: (raw.confidentiality ?? "public").trim().toLowerCase() || "public",
  });
}
