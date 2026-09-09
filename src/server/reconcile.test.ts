import { afterEach, describe, expect, it } from "vitest";

import { createCbtmtRecord } from "@/server/cbtmt";
import { addEiaPack, createEiaActivity } from "@/server/eia";
import { receivePreCollection } from "@/server/mgr";
import { publishPack } from "@/server/packs";
import { reconcile } from "@/server/reconcile";
import { VALID_MGR, createHarness, type Harness } from "@/test/helpers";

describe("reconcile() cache verification", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("reports zero mismatches when all caches are consistent", () => {
    h = createHarness();
    const m = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: m.batch.id, stage: "pre_collection" });

    const e = createEiaActivity(h.db, h.party(), { title: "EIA CCZ", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), e.activity.id, "screening", "Screening outcome", h.key(), { screeningOutcome: "no_eia" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });

    const c = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Training", themes: "taxonomy" }, h.key());
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: c.record.id, stage: "need_posted" });

    const res = reconcile(h.db);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(3);
  });

  it("detects tampered MGR batch caches (current_stage, public_record_id)", () => {
    h = createHarness();
    const m = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: m.batch.id, stage: "pre_collection" });

    // Tamper with cached fields in mgr_batches table (post_collection still has b_sbi != null so constraint passes)
    h.db.prepare("UPDATE mgr_batches SET current_stage = 'post_collection', public_record_id = 'TAMPERED' WHERE id = ?").run(m.batch.id);

    const res = reconcile(h.db);
    expect(res.mismatches.length).toBeGreaterThanOrEqual(2);
    expect(res.mismatches.some((mismatch) => mismatch.table === "mgr_batches" && mismatch.column === "current_stage")).toBe(true);
    expect(res.mismatches.some((mismatch) => mismatch.table === "mgr_batches" && mismatch.column === "public_record_id")).toBe(true);
  });

  it("detects tampered EIA activity caches (latest_pack_status)", () => {
    h = createHarness();
    const e = createEiaActivity(h.db, h.party(), { title: "EIA Activity", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), e.activity.id, "screening", "Screening outcome", h.key(), { screeningOutcome: "no_eia" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });

    // Tamper with latest_pack_status
    h.db.prepare("UPDATE eia_activities SET latest_pack_status = 'pending' WHERE id = ?").run(e.activity.id);

    const res = reconcile(h.db);
    expect(res.mismatches.some((mismatch) => mismatch.table === "eia_activities" && mismatch.column === "latest_pack_status")).toBe(true);
  });

  it("detects tampered CBTMT record caches (public_record_id)", () => {
    h = createHarness();
    const c = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "CBTMT Record", themes: "taxonomy" }, h.key());
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: c.record.id, stage: "need_posted" });

    // Tamper with public_record_id
    h.db.prepare("UPDATE cbtmt_records SET public_record_id = NULL WHERE id = ?").run(c.record.id);

    const res = reconcile(h.db);
    expect(res.mismatches.some((mismatch) => mismatch.table === "cbtmt_records" && mismatch.column === "public_record_id")).toBe(true);
  });
});
