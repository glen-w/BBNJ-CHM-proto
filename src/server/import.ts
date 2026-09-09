/**
 * Bounded, deterministic Excel import (Secretariat only).
 *   .xlsx only · ≤ 2 MB · Meta sheet must carry template name + version
 *   headers normalised and must equal FIELD_DEFS exactly · blank rows skipped
 *   ≤ 200 data rows · formula cells → row error (no evaluation, no cached results)
 *   each row → receivePreCollection(..., "excel") in its own transaction
 */
import ExcelJS from "exceljs";

import type { Db } from "@/lib/db";
import type { IdempotencyKey } from "@/lib/contracts/extensions";
import { FIELD_DEFS, MGR_TEMPLATE_NAME, MGR_TEMPLATE_VERSION, normaliseHeader } from "@/lib/mgr-fields";
import { DomainError } from "./errors";
import { receivePreCollection } from "./mgr";
import { requireCan, type Principal } from "./policy";
import { DATA_SHEET, META_SHEET } from "./template";

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 200;

export interface ImportRowResult {
  row: number;
  ok: boolean;
  batchId?: string;
  bSbi?: string;
  receiptId?: string;
  title?: string;
  error?: string;
}

export interface ImportResult {
  rows: ImportRowResult[];
  accepted: number;
  rejected: number;
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

export async function importMgrExcel(db: Db, actor: Principal, file: Buffer | Uint8Array, partyCode: string, key: IdempotencyKey): Promise<ImportResult> {
  requireCan(actor, "import");
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
  if (metaMap.get("template") !== MGR_TEMPLATE_NAME) throw new DomainError("import_rejected", `Wrong template: expected ${MGR_TEMPLATE_NAME}`);
  if (metaMap.get("templateVersion") !== String(MGR_TEMPLATE_VERSION)) {
    throw new DomainError("import_rejected", `Template version ${metaMap.get("templateVersion") ?? "?"} not accepted — expected ${MGR_TEMPLATE_VERSION}`);
  }

  const data = wb.getWorksheet(DATA_SHEET);
  if (!data) throw new DomainError("import_rejected", `Missing "${DATA_SHEET}" sheet`);

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

  const results: ImportRowResult[] = [];
  for (const row of dataRows) {
    const n = row.number;
    try {
      const raw: Record<string, unknown> = {};
      for (const f of FIELD_DEFS) raw[f.key] = cellText(row.getCell(colForHeader.get(f.excelHeader)!));
      const res = receivePreCollection(db, actor, raw, "excel", `${key}:${n}`.slice(0, 128), { partyCode });
      results.push({ row: n, ok: true, batchId: res.batch.id, bSbi: res.batch.bSbi, receiptId: res.event.receiptId, title: res.batch.title });
    } catch (err) {
      const message =
        err instanceof DomainError
          ? err.details && Array.isArray(err.details)
            ? `${err.message}: ${(err.details as { path: unknown[]; message: string }[]).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`
            : err.message
          : err instanceof Error
            ? err.message
            : String(err);
      results.push({ row: n, ok: false, error: message });
    }
  }
  return { rows: results, accepted: results.filter((r) => r.ok).length, rejected: results.filter((r) => !r.ok).length };
}
