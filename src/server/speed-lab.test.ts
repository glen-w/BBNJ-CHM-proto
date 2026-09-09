import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { dryRunEiaScreeningExcel, dryRunMgrExcel } from "@/server/import";
import { appendSpeedTrials, readSpeedTrials, runSpeedMatrix, SPEED_OPERATIONS } from "@/server/speed-lab";
import { buildEiaScreeningSample, buildMgrSample } from "@/server/template";
import { createHarness, expectDomainCodeAsync, type Harness } from "@/test/helpers";

const count = (h: Harness, table: string) => (h.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("dry-run import (validate only)", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("reports 2 accepted / 1 rejected for the MGR sample without writing anything", async () => {
    h = createHarness();
    const before = { events: count(h, "events"), batches: count(h, "mgr_batches"), runs: count(h, "import_runs") };
    const res = await dryRunMgrExcel(h.secretariat(), await buildMgrSample({ withInvalid: true }), { db: h.db });
    expect(res.domain).toBe("mgr");
    expect(res.accepted).toBe(2);
    expect(res.rejected).toBe(1);
    expect(res.rows.find((r) => !r.ok)?.error).toMatch(/objectives|confidentiality/i);
    expect(res.rows.every((r) => r.batchId === undefined && r.bSbi === undefined)).toBe(true);
    expect({ events: count(h, "events"), batches: count(h, "mgr_batches"), runs: count(h, "import_runs") }).toEqual(before);
  });

  it("reports 2 accepted / 1 rejected for the EIA screening sample without writing anything", async () => {
    h = createHarness();
    const before = { events: count(h, "events"), runs: count(h, "import_runs") };
    const res = await dryRunEiaScreeningExcel(h.secretariat(), await buildEiaScreeningSample({ withInvalid: true }), "XSD", { db: h.db });
    expect(res.domain).toBe("eia");
    expect(res.accepted).toBe(2);
    expect(res.rejected).toBe(1);
    expect({ events: count(h, "events"), runs: count(h, "import_runs") }).toEqual(before);
  });

  it("is Secretariat-only, like the real import", async () => {
    h = createHarness();
    await expectDomainCodeAsync(async () => dryRunMgrExcel(h.party(), await buildMgrSample(), { db: h.db }), "forbidden");
    expect(count(h, "access_refusals")).toBe(1);
  });
});

describe("speed lab matrix + JSONL log", () => {
  let h: Harness;
  let dir: string;
  afterEach(() => {
    h?.cleanup();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("runs every operation for the requested profiles; slower link is slower; nothing is written to the desk", async () => {
    h = createHarness();
    const before = count(h, "import_runs");
    const trials = await runSpeedMatrix(h.secretariat(), ["office", "sids3g"], { db: h.db });
    expect(trials).toHaveLength(SPEED_OPERATIONS.length * 2);
    for (const op of SPEED_OPERATIONS) {
      const office = trials.find((t) => t.operation === op.id && t.profileId === "office")!;
      const sids = trials.find((t) => t.operation === op.id && t.profileId === "sids3g")!;
      expect(office.bytes).toBeGreaterThan(0);
      expect(sids.bytes).toBe(office.bytes);
      expect(sids.transferMs).toBeGreaterThan(office.transferMs);
      expect(sids.totalMs).toBeGreaterThanOrEqual(sids.transferMs);
      if (op.parse) {
        expect(office.parseMs).not.toBeNull();
        expect(office.accepted).toBe(2);
        expect(office.rejected).toBe(1);
      } else {
        expect(office.parseMs).toBeNull();
      }
    }
    expect(count(h, "import_runs")).toBe(before);
  });

  it("appends and reads back newest-first", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-speed-"));
    const file = path.join(dir, "speed-runs.jsonl");
    const mk = (n: number) => ({
      at: `2026-09-09T12:00:0${n}.000Z`,
      actor: "secretariat",
      operation: "mgr_template_download" as const,
      domain: "mgr" as const,
      bytes: 100 * n,
      profileId: "office" as const,
      transferMs: n,
      parseMs: null,
      totalMs: n,
      accepted: null,
      rejected: null,
    });
    appendSpeedTrials([mk(1), mk(2)], file);
    appendSpeedTrials([mk(3)], file);
    const back = readSpeedTrials(10, file);
    expect(back.map((t) => t.bytes)).toEqual([300, 200, 100]);
    expect(readSpeedTrials(2, file)).toHaveLength(2);
    expect(readSpeedTrials(10, path.join(dir, "missing.jsonl"))).toEqual([]);
  });
});
