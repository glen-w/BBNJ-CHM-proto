/**
 * Bounded, deterministic Excel import (Secretariat only).
 *   .xlsx only · ≤ 2 MB · Meta sheet must carry template name + version
 *   headers normalised and must equal FIELD_DEFS exactly · blank rows skipped
 *   ≤ 200 data rows · formula cells → row error (no evaluation, no cached results)
 *   each row → receivePreCollection(..., "excel") in its own transaction
 */
import { createHash } from "node:crypto";

import ExcelJS from "exceljs";

import type { Db } from "@/lib/db";
import type { IdempotencyKey } from "@/lib/contracts/extensions";
import { EIA_SCREENING_FIELDS, EIA_SCREENING_TEMPLATE_NAME, EIA_SCREENING_TEMPLATE_VERSION, coerceEiaScreeningInput, normaliseEiaHeader } from "@/lib/eia-fields";
import { FIELD_DEFS, MGR_TEMPLATE_NAME, MGR_TEMPLATE_VERSION, normaliseHeader } from "@/lib/mgr-fields";
import { addEiaPack, createEiaActivity } from "./eia";
import { DomainError } from "./errors";
import { nowIso } from "./ids";
import { receivePreCollection } from "./mgr";
import { can, requireCan, type Principal } from "./policy";
import { DATA_SHEET, META_SHEET } from "./template";

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 200;

/** Domains with an offline template. The run row has no domain column (schema v5); it travels inside rows_json. */
export type ImportDomain = "mgr" | "eia";

export interface ImportRowResult {
  row: number;
  ok: boolean;
  /** MGR: the batch created by this row. */
  batchId?: string;
  bSbi?: string;
  /** EIA: the activity created by this row. */
  activityId?: string;
  screeningOutcome?: "eia_required" | "no_eia";
  receiptId?: string;
  title?: string;
  error?: string;
  /** Raw cell text by field key — kept for rejected rows so the error report can be re-filled. */
  values?: Record<string, string>;
}

export interface ImportResult {
  runId: string;
  domain: ImportDomain;
  at: string;
  partyCode: string;
  filename?: string;
  bytes: number;
  rows: ImportRowResult[];
  accepted: number;
  rejected: number;
}

type RunRow = { id: string; at: string; actor_user_id: string | null; party_code: string; filename: string | null; bytes: number; accepted: number; rejected: number; rows_json: string };

/** rows_json is either a bare array (MGR runs written before EIA import existed) or `{ domain, rows }`. */
function parseRows(json: string): { domain: ImportDomain; rows: ImportRowResult[] } {
  const parsed = JSON.parse(json) as ImportRowResult[] | { domain?: ImportDomain; rows: ImportRowResult[] };
  if (Array.isArray(parsed)) return { domain: "mgr", rows: parsed };
  return { domain: parsed.domain === "eia" ? "eia" : "mgr", rows: parsed.rows ?? [] };
}

function rowToRun(r: RunRow): ImportResult {
  const { domain, rows } = parseRows(r.rows_json);
  return { runId: r.id, domain, at: r.at, partyCode: r.party_code, filename: r.filename ?? undefined, bytes: r.bytes, accepted: r.accepted, rejected: r.rejected, rows };
}

/** Durable outcome of one import; Secretariat only (same rule as import itself). */
export function getImportRun(db: Db, actor: Principal, runId: string): ImportResult | undefined {
  requireCan(actor, "import", undefined, { recordId: runId, path: `/import/${runId}`, db });
  const r = db.prepare("SELECT * FROM import_runs WHERE id = ?").get(runId) as RunRow | undefined;
  return r ? rowToRun(r) : undefined;
}

export function listImportRuns(db: Db, actor: Principal, limit = 20, domain?: ImportDomain): ImportResult[] {
  if (!can(actor, "import")) return [];
  const all = (db.prepare("SELECT * FROM import_runs ORDER BY at DESC LIMIT ?").all(domain ? limit * 4 : limit) as RunRow[]).map(rowToRun);
  return domain ? all.filter((r) => r.domain === domain).slice(0, limit) : all;
}

/** Page path of a run for its domain. */
export function importRunPath(run: Pick<ImportResult, "runId" | "domain">): string {
  return `/${run.domain}/import/${run.runId}`;
}

function storeRun(db: Db, actor: Principal, run: ImportResult): void {
  db.prepare(
    `INSERT OR IGNORE INTO import_runs (id, at, actor_user_id, party_code, filename, bytes, accepted, rejected, rows_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    run.runId,
    run.at,
    actor.kind === "user" ? actor.user.id : null,
    run.partyCode,
    run.filename ?? null,
    run.bytes,
    run.accepted,
    run.rejected,
    JSON.stringify({ domain: run.domain, rows: run.rows }),
  );
}

/** Shared workbook gate: size, magic bytes, parse, Meta template name + version, Data sheet present. */
async function loadWorkbook(file: Buffer | Uint8Array, template: { name: string; version: number }): Promise<{ wb: ExcelJS.Workbook; data: ExcelJS.Worksheet }> {
  if (file.byteLength > IMPORT_MAX_BYTES) throw new DomainError("import_rejected", `File exceeds ${IMPORT_MAX_BYTES / 1024 / 1024} MB`);
  if (file.byteLength < 4 || file[0] !== 0x50 || file[1] !== 0x4b) throw new DomainError("import_rejected", "Not an .xlsx file");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(file as unknown as ExcelJS.Buffer);
  } catch {
    throw new DomainError("import_rejected", "Could not read the workbook — is it a valid .xlsx file?");
  }

  const meta = wb.getWorksheet(META_SHEET);
  if (!meta) throw new DomainError("import_rejected", `Missing "${META_SHEET}" sheet — download the current template`);
  const metaMap = new Map<string, string>();
  meta.eachRow((r) => {
    const k = String(r.getCell(1).value ?? "").trim();
    if (k) metaMap.set(k, String(r.getCell(2).value ?? "").trim());
  });
  if (metaMap.get("template") !== template.name) throw new DomainError("import_rejected", `Wrong template: expected ${template.name}`);
  if (metaMap.get("templateVersion") !== String(template.version)) {
    throw new DomainError("import_rejected", `Template version ${metaMap.get("templateVersion") ?? "?"} not accepted — expected ${template.version}`);
  }

  const data = wb.getWorksheet(DATA_SHEET);
  if (!data) throw new DomainError("import_rejected", `Missing "${DATA_SHEET}" sheet`);
  return { wb, data };
}

/** Non-blank data rows (row 1 is the header), bounded. */
function dataRowsOf(data: ExcelJS.Worksheet): ExcelJS.Row[] {
  const dataRows: ExcelJS.Row[] = [];
  data.eachRow((row, n) => {
    if (n === 1) return;
    let blank = true;
    row.eachCell({ includeEmpty: false }, (c) => {
      if (c.value !== null && c.value !== undefined && String(c.value).trim() !== "") blank = false;
    });
    if (!blank) dataRows.push(row);
  });
  if (dataRows.length > IMPORT_MAX_ROWS) throw new DomainError("import_rejected", `${dataRows.length} data rows exceed the limit of ${IMPORT_MAX_ROWS}`);
  if (dataRows.length === 0) throw new DomainError("import_rejected", "No data rows found");
  return dataRows;
}

function rowErrorMessage(err: unknown): string {
  return err instanceof DomainError
    ? err.details && Array.isArray(err.details)
      ? `${err.message}: ${(err.details as { path: unknown[]; message: string }[]).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`
      : err.message
    : err instanceof Error
      ? err.message
      : String(err);
}

function cellText(cell: ExcelJS.Cell): string {
  if (cell.type === ExcelJS.ValueType.Formula || cell.formula) {
    throw new DomainError("validation", `Formula cell at ${cell.address} — formulas are not accepted`);
  }
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: string; hyperlink?: string; result?: unknown; formula?: string };
    if (o.formula !== undefined) throw new DomainError("validation", `Formula cell at ${cell.address} — formulas are not accepted`);
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text !== undefined) return String(o.text);
    return "";
  }
  return String(v);
}

export async function importMgrExcel(
  db: Db,
  actor: Principal,
  file: Buffer | Uint8Array,
  partyCode: string,
  key: IdempotencyKey,
  opts: { filename?: string } = {},
): Promise<ImportResult> {
  requireCan(actor, "import", undefined, { domain: "mgr", path: "/mgr/import", db });
  // Idempotent: the same key returns the stored run.
  const prior = db.prepare("SELECT * FROM import_runs WHERE id = ?").get(runIdFor(key)) as RunRow | undefined;
  if (prior) return rowToRun(prior);
  const { data } = await loadWorkbook(file, { name: MGR_TEMPLATE_NAME, version: MGR_TEMPLATE_VERSION });

  const expected = FIELD_DEFS.map((f) => f.excelHeader);
  const headerRow = data.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (c) => headers.push(normaliseHeader(c.value)));
  const missing = expected.filter((h) => !headers.includes(h));
  const unknown = headers.filter((h) => !expected.includes(h));
  if (missing.length || unknown.length) {
    throw new DomainError("import_rejected", `Header mismatch — missing: [${missing.join(", ")}] unknown: [${unknown.join(", ")}]`);
  }
  const colForHeader = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (c, col) => colForHeader.set(normaliseHeader(c.value), col));

  const dataRows = dataRowsOf(data);

  const results: ImportRowResult[] = [];
  for (const row of dataRows) {
    const n = row.number;
    const values: Record<string, string> = {};
    try {
      const raw: Record<string, unknown> = {};
      for (const f of FIELD_DEFS) {
        const text = cellText(row.getCell(colForHeader.get(f.excelHeader)!));
        raw[f.key] = text;
        values[f.key] = text;
      }
      const res = receivePreCollection(db, actor, raw, "excel", `${key}:${n}`.slice(0, 128), { partyCode });
      results.push({ row: n, ok: true, batchId: res.batch.id, bSbi: res.batch.bSbi, receiptId: res.event.receiptId, title: res.batch.title });
    } catch (err) {
      // Formula rows abort before every cell is read; keep whatever text we have so the report still shows the row.
      results.push({ row: n, ok: false, error: rowErrorMessage(err), values });
    }
  }
  const run: ImportResult = {
    runId: runIdFor(key),
    domain: "mgr",
    at: nowIso(),
    partyCode,
    filename: opts.filename,
    bytes: file.byteLength,
    rows: results,
    accepted: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok).length,
  };
  storeRun(db, actor, run);
  return run;
}

/**
 * EIA screening import (Secretariat only) — the Art 51.5 offline pattern applied
 * beyond MGR. Each accepted row becomes one activity (sourceChannel excel) whose
 * screening pack is submitted as pending with its Art 31 outcome, in its own
 * transaction. `partyCode` is the default for rows whose party_code cell is empty;
 * a filled cell wins.
 */
export async function importEiaScreeningExcel(
  db: Db,
  actor: Principal,
  file: Buffer | Uint8Array,
  partyCode: string,
  key: IdempotencyKey,
  opts: { filename?: string } = {},
): Promise<ImportResult> {
  requireCan(actor, "import", undefined, { domain: "eia", path: "/eia/import", db });
  const prior = db.prepare("SELECT * FROM import_runs WHERE id = ?").get(runIdFor(key)) as RunRow | undefined;
  if (prior) return rowToRun(prior);
  const { data } = await loadWorkbook(file, { name: EIA_SCREENING_TEMPLATE_NAME, version: EIA_SCREENING_TEMPLATE_VERSION });

  const expected = EIA_SCREENING_FIELDS.map((f) => f.excelHeader);
  const headerRow = data.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (c) => headers.push(normaliseEiaHeader(String(c.value ?? ""))));
  const missing = expected.filter((h) => !headers.includes(h));
  const unknown = headers.filter((h) => !expected.includes(h));
  if (missing.length || unknown.length) {
    throw new DomainError("import_rejected", `Header mismatch — missing: [${missing.join(", ")}] unknown: [${unknown.join(", ")}]`);
  }
  const colForHeader = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (c, col) => colForHeader.set(normaliseEiaHeader(String(c.value ?? "")), col));

  const dataRows = dataRowsOf(data);
  const defaultParty = partyCode.trim().toUpperCase();

  const results: ImportRowResult[] = [];
  for (const row of dataRows) {
    const n = row.number;
    const values: Record<string, string> = {};
    try {
      for (const f of EIA_SCREENING_FIELDS) values[f.key] = cellText(row.getCell(colForHeader.get(f.excelHeader)!));
      const raw = { ...values, partyCode: values.partyCode.trim() || defaultParty };
      let input;
      try {
        input = coerceEiaScreeningInput(raw);
      } catch (e) {
        const issues = (e as { issues?: unknown }).issues;
        throw new DomainError("validation", "Screening row incomplete", Array.isArray(issues) ? issues : undefined);
      }
      const rowKey = `${key}:${n}`.slice(0, 128);
      const tx = db.transaction(() => {
        const created = createEiaActivity(
          db,
          actor,
          { title: input.title, abnjBox: input.abnjBox, partyCode: input.partyCode, confidentiality: input.confidentiality, sourceChannel: "excel" },
          rowKey,
        );
        const pack = addEiaPack(db, actor, created.activity.id, "screening", `Screening (offline Excel, Art 31): ${input.screeningOutcome.replace("_", " ")}`, `${rowKey}:screening`.slice(0, 128), {
          screeningOutcome: input.screeningOutcome,
          status: "pending",
        });
        return { created, pack };
      });
      const { created, pack } = tx();
      results.push({
        row: n,
        ok: true,
        activityId: created.activity.id,
        screeningOutcome: input.screeningOutcome,
        receiptId: pack.event.receiptId,
        title: created.activity.title,
      });
    } catch (err) {
      results.push({ row: n, ok: false, error: rowErrorMessage(err), values });
    }
  }
  const run: ImportResult = {
    runId: runIdFor(key),
    domain: "eia",
    at: nowIso(),
    partyCode: defaultParty,
    filename: opts.filename,
    bytes: file.byteLength,
    rows: results,
    accepted: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok).length,
  };
  storeRun(db, actor, run);
  return run;
}

/** Deterministic, UUID-shaped run id derived from the idempotency key — replaying the same import returns the same run. */
export function runIdFor(key: string): string {
  const h = createHash("sha1").update(`import-run:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
