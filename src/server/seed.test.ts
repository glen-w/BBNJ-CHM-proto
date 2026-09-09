import { afterEach, describe, expect, it } from "vitest";

import { AbnjBox } from "@/lib/contracts/events";
import { getMgrBatch } from "@/server/mgr";
import { getEiaActivity } from "@/server/eia";
import { getAbmtProposal } from "@/server/abmt";
import { seedDatabase, seedIfEmpty } from "@/server/seed";
import { EIA_CSV_SEEDS, SEED_ABNJ_BOXES } from "@/server/seed-pack";
import { createHarness, type Harness } from "@/test/helpers";

describe("seed I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("seedIfEmpty is a no-op when users already exist", () => {
    h = createHarness();
    const before = (h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    expect(seedIfEmpty(h.db)).toEqual({ seeded: false });
    expect((h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n).toBe(before);
  });

  it("seedDatabase is idempotent when replayed with the same keys", () => {
    h = createHarness();
    const first = seedDatabase(h.db);
    const counts = () => ({
      events: (h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n,
      batches: (h.db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n,
      matches: (h.db.prepare("SELECT COUNT(*) AS n FROM cbtmt_matches").get() as { n: number }).n,
    });
    const before = counts();
    const second = seedDatabase(h.db);
    expect(second.mgr.published).toBe(first.mgr.published);
    expect(counts()).toEqual(before);
    expect(first.cbtmt.matchId).toBeTruthy();
  });

  it("rich CSV pack — interim MGR, three EIA storylines, published ABMT stub, extended AbnjBox", () => {
    h = createHarness();
    const ids = seedDatabase(h.db);

    const interim = getMgrBatch(h.db, ids.rich.mgr.interimTemp)!;
    expect(interim.title).toMatch(/BBNJ-MGR-TEMP-2026-001/);
    expect(interim.bSbi).toBeTruthy();
    expect(interim.publicRecordId).toBeTruthy();
    expect(interim.bSbi).not.toBe(interim.publicRecordId);
    expect(interim.details.dataManagementPlan).toContain("bbnj-mgr-temp-2026-001");
    const interimEvt = h.db
      .prepare("SELECT summary, artifact_refs_json FROM events WHERE record_id = ? AND stage = 'pre_collection' AND status = 'published'")
      .get(interim.id) as { summary: string; artifact_refs_json: string };
    expect(interimEvt.summary).toMatch(/BBNJ-MGR-TEMP-2026-001/);
    expect(interimEvt.artifact_refs_json).toContain("bbnj-mgr-temp-2026-001");

    for (const key of ["rocket", "marineCdr", "mesopelagic"] as const) {
      const act = getEiaActivity(h.db, ids.rich.eia[key])!;
      const csv = EIA_CSV_SEEDS.find((e) => act.title === e.title);
      expect(csv).toBeTruthy();
      expect(AbnjBox.safeParse(act.abnjBox).success).toBe(true);
    }
    expect(getEiaActivity(h.db, ids.rich.eia.rocket)!.title).toMatch(/splashdown/i);
    expect(getEiaActivity(h.db, ids.rich.eia.marineCdr)!.title).toMatch(/alkalinity/i);
    expect(getEiaActivity(h.db, ids.rich.eia.mesopelagic)!.title).toMatch(/mesopelagic/i);

    const sargasso = getAbmtProposal(h.db, ids.rich.abmt.sargasso)!;
    expect(sargasso.publicRecordId).toMatch(/^BBNJ-ABMT-/);
    expect(getAbmtProposal(h.db, ids.rich.abmt.crDome)!.publicRecordId).toBeUndefined();

    expect([...SEED_ABNJ_BOXES]).toEqual([...AbnjBox.options]);
    expect(AbnjBox.safeParse("Mid-Atlantic Splashdown Corridor").success).toBe(true);
    expect(AbnjBox.safeParse("NE Atlantic Mesopelagic Belt").success).toBe(true);
  });
});
