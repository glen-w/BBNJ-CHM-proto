/**
 * Exports — CSV (RFC 4180) and JSON envelopes over the same policy-filtered
 * queries the pages use, so an export can never show more than the page.
 * PDF is a hand-rolled one-page text stub (no dependency), labelled as such.
 */
import type { Db } from "@/lib/db";
import { SCHEMA_VERSION } from "@/lib/db/schema";
import type { Domain } from "@/lib/contracts/events";
import type { StoredEvent } from "@/lib/contracts/extensions";
import { getCbtmtRecord, matchesForRecord } from "./cbtmt";
import { getEiaActivity } from "./eia";
import { nowIso } from "./ids";
import { getMgrBatch } from "./mgr";
import { versionsOfPack } from "./outbox";
import { actorRoleOf, can, type Principal, readPolicy, recordRefusal } from "./policy";
import { auditRows, listCbtmtRecords, listEiaActivities, listMgrBatches, packsOf, resolvePublicRecord, timelineOf } from "./queries";

export type ExportDomain = "mgr" | "eia" | "cbtmt" | "audit";
export const EXPORT_DOMAINS: ExportDomain[] = ["mgr", "eia", "cbtmt", "audit"];

export type Cell = string | number | boolean | null;
export interface Tabular {
  columns: string[];
  rows: Record<string, Cell>[];
}

const s = (v: unknown): Cell => (v === undefined || v === null ? null : typeof v === "boolean" || typeof v === "number" ? v : String(v));

export function exportTable(db: Db, p: Principal, domain: ExportDomain): Tabular {
  switch (domain) {
    case "mgr": {
      const columns = ["publicRecordId", "bSbi", "title", "partyCode", "currentStage", "sourceChannel", "confidentiality", "tkFpicFlag", "locationHint", "updatedAt", "internalId"];
      return {
        columns,
        rows: listMgrBatches(db, p).map((b) => ({
          publicRecordId: s(b.publicRecordId),
          bSbi: s(b.bSbi),
          title: b.title,
          partyCode: b.partyCode,
          currentStage: b.currentStage,
          sourceChannel: b.sourceChannel,
          confidentiality: b.confidentiality,
          tkFpicFlag: b.tkFpicFlag,
          locationHint: s(b.locationHint),
          updatedAt: b.updatedAt,
          internalId: b.id,
        })),
      };
    }
    case "eia": {
      const columns = ["publicRecordId", "title", "partyCode", "abnjBox", "currentStage", "latestPackStatus", "sourceChannel", "confidentiality", "updatedAt", "internalId"];
      return {
        columns,
        rows: listEiaActivities(db, p).map((a) => ({
          publicRecordId: s(a.publicRecordId),
          title: a.title,
          partyCode: a.partyCode,
          abnjBox: a.abnjBox,
          currentStage: a.currentStage,
          latestPackStatus: s(a.latestPackStatus),
          sourceChannel: a.sourceChannel,
          confidentiality: a.confidentiality,
          updatedAt: a.updatedAt,
          internalId: a.id,
        })),
      };
    }
    case "cbtmt": {
      const columns = ["publicRecordId", "kind", "title", "themes", "partyCode", "provider", "stage", "confidentiality", "updatedAt", "internalId"];
      return {
        columns,
        rows: listCbtmtRecords(db, p).map((r) => ({
          publicRecordId: s(r.publicRecordId),
          kind: r.kind,
          title: r.title,
          themes: r.themes.join("|"),
          partyCode: r.kind === "need" ? r.partyCode : null,
          provider: r.kind === "offer" ? r.provider : null,
          stage: r.stage,
          confidentiality: r.confidentiality,
          updatedAt: r.updatedAt,
          internalId: r.id,
        })),
      };
    }
    case "audit": {
      const full = can(p, "view_full_audit");
      const columns = ["seq", "at", "domain", "stage", "status", "version", "recordId", "publicRecordId", "receiptId", "bSbi", "actorRole", "confidentiality", "summary", ...(full ? ["actorUserId", "idempotencyKey", "dispatchedAt", "deliveredCount", "dispatchError"] : [])];
      return {
        columns,
        rows: auditRows(db, p, { limit: 5000 }).map((r) => ({
          seq: r.seq,
          at: r.at,
          domain: r.domain,
          stage: r.stage,
          status: r.status,
          version: r.version,
          recordId: r.recordId,
          publicRecordId: s(r.publicRecordId),
          receiptId: s(r.receiptId),
          bSbi: s(r.bSbi),
          actorRole: r.actorRole,
          confidentiality: r.confidentiality,
          summary: r.summary,
          ...(full
            ? {
                actorUserId: s(r.actorUserId),
                idempotencyKey: s(r.idempotencyKey),
                dispatchedAt: s(r.dispatch?.at),
                deliveredCount: r.dispatch ? r.dispatch.deliveredCount : null,
                dispatchError: s(r.dispatch?.error),
              }
            : {}),
        })),
      };
    }
  }
}

/** RFC 4180: CRLF line ends, quote fields containing comma/quote/CR/LF, double embedded quotes. */
export function toCsv(t: Tabular): string {
  const esc = (v: Cell) => {
    if (v === null) return "";
    const str = typeof v === "string" ? v : String(v);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [t.columns.map(esc).join(",")];
  for (const r of t.rows) lines.push(t.columns.map((c) => esc(r[c] ?? null)).join(","));
  return lines.join("\r\n") + "\r\n";
}

export interface JsonEnvelope<T> {
  schemaVersion: number;
  contract: "proposal/schemas/events.ts";
  generatedAt: string;
  role: string;
  count: number;
  rows: T;
}

export function envelope<T extends unknown[]>(p: Principal, rows: T): JsonEnvelope<T> {
  return { schemaVersion: SCHEMA_VERSION, contract: "proposal/schemas/events.ts", generatedAt: nowIso(), role: actorRoleOf(p), count: rows.length, rows };
}

// ------------------------------------------------------------------ single record

export interface RecordExport {
  publicRecordId: string;
  domain: Domain;
  record: Record<string, unknown>;
  packs: StoredEvent[];
  versions: Record<string, StoredEvent[]>;
  timeline: ReturnType<typeof timelineOf>;
  matches?: ReturnType<typeof matchesForRecord>;
}

/** Full record view for the caller's role, or undefined (invisible or unknown → caller answers 404 and a refusal is logged). */
export function exportRecord(db: Db, p: Principal, publicRecordId: string, path?: string): RecordExport | undefined {
  const hit = resolvePublicRecord(db, p, publicRecordId);
  if (!hit) {
    recordRefusal(p, "read_record", { recordId: publicRecordId, path, reason: `Record ${publicRecordId} not visible to ${actorRoleOf(p)}`, db });
    return undefined;
  }
  const packs = packsOf(db, p, hit.recordId);
  const stages = Array.from(new Set(packs.map((e) => e.stage)));
  const visibleIds = new Set(packs.map((e) => e.id));
  const versions: Record<string, StoredEvent[]> = {};
  for (const st of stages) versions[st] = versionsOfPack(db, hit.recordId, st).filter((e) => visibleIds.has(e.id));
  const timeline = timelineOf(db, p, hit.recordId);
  const base = { publicRecordId, domain: hit.domain, packs, versions, timeline };
  switch (hit.domain) {
    case "mgr":
      return { ...base, record: projectRecord(p, getMgrBatch(db, hit.recordId)!) };
    case "eia":
      return { ...base, record: projectRecord(p, getEiaActivity(db, hit.recordId)!) };
    case "cbtmt":
      return { ...base, record: projectRecord(p, getCbtmtRecord(db, hit.recordId)!), matches: matchesForRecord(db, hit.recordId) };
    default:
      return undefined;
  }
}

/** Drop ownership pointers from public projections. */
function projectRecord(p: Principal, rec: Record<string, unknown>): Record<string, unknown> {
  if (readPolicy(p).all) return rec;
  const { ownerUserId: _o, detailsHistory: _h, ...rest } = rec as Record<string, unknown> & { ownerUserId?: unknown; detailsHistory?: unknown };
  void _o;
  void _h;
  return rest;
}

// ------------------------------------------------------------------ PDF stub

/** WinAnsi-safe text for a PDF literal string. */
function pdfText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, (ch) => (ch === "\u2014" || ch === "\u2013" ? "-" : ch === "\u2192" ? "->" : ch === "\u00b7" ? "*" : "?"))
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(line: string, width = 92): string[] {
  const words = line.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      out.push(cur.trim());
      cur = w;
    } else cur = `${cur} ${w}`;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [""];
}

/**
 * Minimal single-page PDF 1.4 (Helvetica/Courier, no compression). Enough for
 * a viewer to open; explicitly a stub — not a certified extract.
 */
export function buildPdf(title: string, lines: string[]): Buffer {
  const pageLines = [title, "", ...lines.flatMap((l) => wrap(l))].slice(0, 58);
  const content: string[] = ["BT", "/F1 14 Tf", "50 790 Td", `(${pdfText(pageLines[0])}) Tj`, "/F2 9 Tf", "0 -22 Td"];
  for (let i = 1; i < pageLines.length; i++) content.push(`(${pdfText(pageLines[i])}) Tj`, "0 -12 Td");
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) body += `${String(o).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

export function recordPdf(db: Db, p: Principal, publicRecordId: string, path?: string): Buffer | undefined {
  const rec = exportRecord(db, p, publicRecordId, path);
  if (!rec) return undefined;
  const r = rec.record as Record<string, unknown>;
  const lines: string[] = [
    `EXTRACT - generated ${nowIso()} for role ${actorRoleOf(p)}.`,
    "",
    `publicRecordId: ${rec.publicRecordId}`,
    `domain: ${rec.domain.toUpperCase()}   title: ${String(r.title ?? "")}`,
    ...(r.bSbi ? [`B-SBI (Art 12): ${String(r.bSbi)}  (minted at receipt, unchanged by publication)`] : []),
    ...(r.partyCode ? [`party: ${String(r.partyCode)}`] : []),
    ...(r.abnjBox ? [`ABNJ box: ${String(r.abnjBox)}`] : []),
    `confidentiality: ${String(r.confidentiality ?? "public")}`,
    `stage: ${String(r.currentStage ?? r.stage ?? "")}`,
    "",
    "Packs (latest row per stage/version visible to your role):",
    ...rec.packs.map((e) => `  ${e.stage} v${e.version} ${e.status} ${e.at.slice(0, 10)}${e.version > 1 ? ` [amended${e.materialChange ? ", material" : ""}${e.changeNote ? `: ${e.changeNote}` : ""}]` : ""} - ${e.summary}`),
    "",
    "Timeline:",
    ...rec.timeline.slice(-20).map((t) => `  #${t.seq} ${t.at.slice(0, 16)} ${t.stage} v${t.version} ${t.status} by ${t.actorRole}`),
    "",
    `Machine-readable: /api/records/${rec.publicRecordId}.json`,
  ];
  return buildPdf(`BBNJ Cl-HM record ${rec.publicRecordId}`, lines);
}
