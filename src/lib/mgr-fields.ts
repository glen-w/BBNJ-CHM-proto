/**
 * FIELD_DEFS — single source of truth for the MGR pre-collection notification:
 * form fields, Zod input schema, Excel template headers, field-guide sheet,
 * import header map.
 *
 * `basis` cites the Agreement article the field traces to, or "implementation".
 * Sub-paragraph letters follow Art 12.2 of the Agreement; verify against the
 * authentic text before external use.
 */
import { z } from "zod";

import { ConfidentialityTier } from "@/lib/contracts/events";

export type FieldKind = "text" | "textarea" | "boolean" | "select";

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  kind: FieldKind;
  /** Column on mgr_batches, or entry in details JSON. */
  storage: "column" | "details";
  basis: string;
  help: string;
  excelHeader: string;
  options?: readonly string[];
}

export const MGR_TEMPLATE_NAME = "mgr-pre-collection";
export const MGR_TEMPLATE_VERSION = 1;

export const FIELD_DEFS: readonly FieldDef[] = [
  {
    key: "title",
    label: "Title of collection activity",
    required: true,
    kind: "text",
    storage: "column",
    basis: "Art 12.2(b) — subject matter of the research",
    help: "Short working title, e.g. cruise name and target area.",
    excelHeader: "title",
  },
  {
    key: "locationHint",
    label: "Geographical area",
    required: true,
    kind: "text",
    storage: "column",
    basis: "Art 12.2(c) — geographical areas in which collection is to be undertaken",
    help: "Named ABNJ area or coordinates. No map required.",
    excelHeader: "geographical_area",
  },
  {
    key: "objectives",
    label: "Nature and objectives",
    required: false,
    kind: "textarea",
    storage: "details",
    basis: "Art 12.2(a) — nature and objectives of the collection",
    help: "One paragraph.",
    excelHeader: "objectives",
  },
  {
    key: "methodMeans",
    label: "Method and means (incl. vessel)",
    required: false,
    kind: "textarea",
    storage: "details",
    basis: "Art 12.2(d) — summary of method and means, incl. vessel name, tonnage, type and class",
    help: "Vessel, equipment, sampling approach.",
    excelHeader: "method_means",
  },
  {
    key: "expectedDates",
    label: "Expected dates",
    required: false,
    kind: "text",
    storage: "details",
    basis: "Art 12.2(f) — anticipated dates of first appearance and final departure",
    help: "e.g. 2026-11-03 to 2026-12-01.",
    excelHeader: "expected_dates",
  },
  {
    key: "sponsoringInstitution",
    label: "Sponsoring institution and person in charge",
    required: false,
    kind: "text",
    storage: "details",
    basis: "Art 12.2(g) — sponsoring institution(s) and person in charge",
    help: "Institution, name, contact.",
    excelHeader: "sponsoring_institution",
  },
  {
    key: "participationOpportunities",
    label: "Participation opportunities for developing States",
    required: false,
    kind: "textarea",
    storage: "details",
    basis: "Art 12.2(h)–(i) — opportunities for scientists of developing States to participate",
    help: "Berths, training, data access.",
    excelHeader: "participation_opportunities",
  },
  {
    key: "dataManagementPlan",
    label: "Data management plan (reference)",
    required: false,
    kind: "text",
    storage: "details",
    basis: "Art 12.2(j) — data management plan under open and responsible data governance",
    help: "Link or short reference.",
    excelHeader: "data_management_plan",
  },
  {
    key: "tkFpicFlag",
    label: "Traditional knowledge associated (FPIC metadata flag)",
    required: false,
    kind: "boolean",
    storage: "column",
    basis: "Art 13 — metadata-first; no TK content stored",
    help: "Tick if TK of Indigenous Peoples / local communities is associated. Metadata only.",
    excelHeader: "tk_fpic_flag",
  },
  {
    key: "confidentiality",
    label: "Confidentiality tier",
    required: false,
    kind: "select",
    storage: "column",
    basis: "implementation — PrepCom3 annex confidentiality categories",
    help: "public (default) · restricted · confidential.",
    excelHeader: "confidentiality",
    options: ConfidentialityTier.options,
  },
] as const;

export const FIELD_KEYS = FIELD_DEFS.map((f) => f.key);

/** Zod input schema built from FIELD_DEFS (never the other way round). */
export function buildMgrInputSchema() {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of FIELD_DEFS) {
    switch (f.kind) {
      case "boolean":
        shape[f.key] = z.boolean().default(false);
        break;
      case "select":
        shape[f.key] = z.enum(f.options as [string, ...string[]]).default(f.options![0]);
        break;
      default: {
        const base = z.string().trim().max(4000);
        shape[f.key] = f.required ? base.min(1, `${f.label} is required`) : base.optional().default("");
      }
    }
  }
  return z.object(shape);
}

export const MgrPreCollectionInput = buildMgrInputSchema();
export type MgrPreCollectionInput = z.infer<typeof MgrPreCollectionInput>;

/** Normalise raw string map (form or spreadsheet row) into the input schema's expected primitives. */
export function coerceMgrInput(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FIELD_DEFS) {
    const v = raw[f.key];
    if (f.kind === "boolean") {
      out[f.key] = v === true || v === "on" || v === "true" || v === "1" || v === "yes" || v === "y";
    } else if (f.kind === "select") {
      const s = typeof v === "string" && v.trim() !== "" ? v.trim().toLowerCase() : undefined;
      out[f.key] = s ?? f.options![0];
    } else {
      out[f.key] = typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
    }
  }
  return out;
}

export function splitMgrInput(input: MgrPreCollectionInput) {
  const columns: Record<string, unknown> = {};
  const details: Record<string, string> = {};
  for (const f of FIELD_DEFS) {
    const v = input[f.key as keyof MgrPreCollectionInput];
    if (f.storage === "column") columns[f.key] = v;
    else if (typeof v === "string" && v !== "") details[f.key] = v;
  }
  return { columns, details };
}

export function normaliseHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}
