/**
 * Speed lab — the offline Excel loop timed under mocked connection profiles.
 *
 * Transfer time is *calculated* from CONNECTION_PROFILES (nominal kbps + RTT);
 * parse/validate time is *measured* locally with a validate-only pass that
 * writes nothing. Trials are appended to a JSONL file under data/ (gitignored),
 * not to SQLite: this is lab instrumentation, not an audit rail, and it must
 * not force a SCHEMA_VERSION bump.
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { Db } from "@/lib/db";
import { resolveDbPath } from "@/lib/db";
import { connectionProfile, transferMs, type ConnectionProfileId, type TransferDirection } from "@/lib/connection-profiles";
import { dryRunEiaScreeningExcel, dryRunMgrExcel, type DryRunResult, type ImportDomain } from "./import";
import { nowIso } from "./ids";
import { actorRoleOf, requireCan, type Principal } from "./policy";
import { buildEiaScreeningErrorReport, buildEiaScreeningSample, buildEiaScreeningTemplate, buildMgrErrorReport, buildMgrSample, buildMgrTemplate } from "./template";

export type SpeedOperationId =
  | "mgr_template_download"
  | "mgr_sample_upload"
  | "mgr_error_report_download"
  | "eia_template_download"
  | "eia_sample_upload"
  | "eia_error_report_download";

export interface SpeedOperation {
  id: SpeedOperationId;
  domain: ImportDomain;
  label: string;
  direction: TransferDirection;
  /** True when the operation includes a measured validate-only parse. */
  parse: boolean;
}

/** The closed loop, per domain: download template → upload filled sample → download error workbook. */
export const SPEED_OPERATIONS: readonly SpeedOperation[] = [
  { id: "mgr_template_download", domain: "mgr", label: "Download MGR template", direction: "download", parse: false },
  { id: "mgr_sample_upload", domain: "mgr", label: "Upload MGR sample (2 valid + 1 invalid)", direction: "upload", parse: true },
  { id: "mgr_error_report_download", domain: "mgr", label: "Download MGR error workbook", direction: "download", parse: false },
  { id: "eia_template_download", domain: "eia", label: "Download EIA screening template", direction: "download", parse: false },
  { id: "eia_sample_upload", domain: "eia", label: "Upload EIA screening sample (2 valid + 1 invalid)", direction: "upload", parse: true },
  { id: "eia_error_report_download", domain: "eia", label: "Download EIA error workbook", direction: "download", parse: false },
];

export interface SpeedTrial {
  at: string;
  /** Role of who ran it (never a user id — this is a lab log, not audit). */
  actor: string;
  operation: SpeedOperationId;
  domain: ImportDomain;
  bytes: number;
  profileId: ConnectionProfileId;
  /** Mocked wire time from the profile table. */
  transferMs: number;
  /** Measured validate-only parse, or null when the operation has no parse leg. */
  parseMs: number | null;
  totalMs: number;
  accepted: number | null;
  rejected: number | null;
}

/** One measured payload per operation: bytes plus (for uploads) the dry-run outcome and its wall time. */
interface Measured {
  bytes: number;
  parseMs: number | null;
  dry?: DryRunResult;
}

/** Build the payloads once, so every profile in a matrix sees the same bytes. */
async function measureAll(actor: Principal, db?: Db): Promise<Record<SpeedOperationId, Measured>> {
  const mgrTemplate = await buildMgrTemplate();
  const mgrSample = await buildMgrSample({ withInvalid: true });
  const t0 = performance.now();
  const mgrDry = await dryRunMgrExcel(actor, mgrSample, { db });
  const mgrParse = performance.now() - t0;
  const mgrErrors = await buildMgrErrorReport({ runId: "lab-dry-run", at: nowIso(), rows: mgrDry.rows });

  const eiaTemplate = await buildEiaScreeningTemplate();
  const eiaSample = await buildEiaScreeningSample({ withInvalid: true });
  const t1 = performance.now();
  const eiaDry = await dryRunEiaScreeningExcel(actor, eiaSample, "XSD", { db });
  const eiaParse = performance.now() - t1;
  const eiaErrors = await buildEiaScreeningErrorReport({ runId: "lab-dry-run", at: nowIso(), rows: eiaDry.rows });

  return {
    mgr_template_download: { bytes: mgrTemplate.byteLength, parseMs: null },
    mgr_sample_upload: { bytes: mgrSample.byteLength, parseMs: mgrParse, dry: mgrDry },
    mgr_error_report_download: { bytes: mgrErrors.byteLength, parseMs: null },
    eia_template_download: { bytes: eiaTemplate.byteLength, parseMs: null },
    eia_sample_upload: { bytes: eiaSample.byteLength, parseMs: eiaParse, dry: eiaDry },
    eia_error_report_download: { bytes: eiaErrors.byteLength, parseMs: null },
  };
}

/**
 * Run every operation for each requested profile. Secretariat only (same rule as
 * import). Writes nothing to SQLite; the caller decides whether to log.
 */
export async function runSpeedMatrix(actor: Principal, profileIds: readonly ConnectionProfileId[], opts: { db?: Db } = {}): Promise<SpeedTrial[]> {
  requireCan(actor, "import", undefined, { path: "/lab/speed", db: opts.db });
  const measured = await measureAll(actor, opts.db);
  const at = nowIso();
  const role = actorRoleOf(actor);
  const trials: SpeedTrial[] = [];
  for (const profileId of profileIds) {
    const profile = connectionProfile(profileId);
    for (const op of SPEED_OPERATIONS) {
      const m = measured[op.id];
      const wire = transferMs(profile, m.bytes, op.direction);
      const parseMs = m.parseMs === null ? null : Math.round(m.parseMs * 10) / 10;
      trials.push({
        at,
        actor: role,
        operation: op.id,
        domain: op.domain,
        bytes: m.bytes,
        profileId,
        transferMs: wire,
        parseMs,
        totalMs: Math.round(wire + (parseMs ?? 0)),
        accepted: m.dry?.accepted ?? null,
        rejected: m.dry?.rejected ?? null,
      });
    }
  }
  return trials;
}

/** Sum of one profile's operations — the whole closed loop for one domain (or both). */
export function loopTotalMs(trials: readonly SpeedTrial[], profileId: ConnectionProfileId, domain?: ImportDomain): number {
  return trials.filter((t) => t.profileId === profileId && (!domain || t.domain === domain)).reduce((s, t) => s + t.totalMs, 0);
}

// ------------------------------------------------------------------ JSONL log (data/speed-runs.jsonl)

/** Sibling of the SQLite file, so DATABASE_PATH also relocates the lab log (tests, Docker volume). */
export function resolveSpeedLogPath(): string {
  return process.env.SPEED_LOG_PATH ?? path.join(path.dirname(resolveDbPath()), "speed-runs.jsonl");
}

export function appendSpeedTrials(trials: readonly SpeedTrial[], file = resolveSpeedLogPath()): void {
  if (trials.length === 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, trials.map((t) => JSON.stringify(t)).join("\n") + "\n", "utf8");
}

/** Newest first. Malformed lines are skipped rather than failing the page. */
export function readSpeedTrials(limit = 60, file = resolveSpeedLogPath()): SpeedTrial[] {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "");
  const out: SpeedTrial[] = [];
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    try {
      out.push(JSON.parse(lines[i]) as SpeedTrial);
    } catch {
      // skip
    }
  }
  return out;
}

export function speedLogText(file = resolveSpeedLogPath()): string {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
