import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AbnjBox } from "@/lib/contracts/events";
import { getAbmtProposal } from "@/server/abmt";
import { listMatches, suggestMatches } from "@/server/cbtmt";
import { getEiaActivity, packsForActivity } from "@/server/eia";
import { getMgrBatch } from "@/server/mgr";
import { principalFor } from "@/server/policy";
import { listRelatedResearchForAbmt } from "@/server/research";
import { seedDatabase, seedIfEmpty } from "@/server/seed";
import {
  agreementBasisExtrasForRecord,
  clearSeedPackCache,
  csvStorylineCounts,
  getSeedPack,
  isIsaNotUndermineAbmtRecord,
  provenanceBadgeForRecord,
} from "@/server/seed-pack";
import { findUserByUsername } from "@/server/users";
import { createHarness, type Harness } from "@/test/helpers";

/** Boxes listed in the authored pack CSV. */
function abnjBoxesFromFixtureCsv(): string[] {
  const raw = readFileSync(join(process.cwd(), "fixtures/bbnj-chm-seed-pack/csv/abnj_boxes.csv"), "utf8");
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")[0]!.trim())
    .filter(Boolean);
}

describe("seed I/O", () => {
  let h: Harness;
  afterEach(() => {
    h?.cleanup();
    clearSeedPackCache();
  });

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
      research: (h.db.prepare("SELECT COUNT(*) AS n FROM research_items").get() as { n: number }).n,
    });
    const before = counts();
    const second = seedDatabase(h.db);
    expect(second.mgr.published).toBe(first.mgr.published);
    expect(counts()).toEqual(before);
    expect(first.cbtmt.matchId).toBeTruthy();
  });

  it("loads fixtures/bbnj-chm-seed-pack CSVs out of the box", () => {
    clearSeedPackCache();
    const pack = getSeedPack();
    expect(pack.mgr.map((m) => m.seedKey)).toEqual(
      expect.arrayContaining([
        "mgr-interim-temp-001",
        "mgr-hydrothermal-indian",
        "mgr-sargasso-pending",
        "mgr-assisted-sids",
        "mgr-southern-edna",
      ]),
    );
    expect(pack.eia.map((e) => e.seedKey)).toEqual(
      expect.arrayContaining([
        "eia-rocket-splashdown",
        "eia-marine-cdr-oae",
        "eia-mesopelagic-fishery",
        "eia-cable-southern",
        "eia-vent-indian",
      ]),
    );
    expect(pack.abmt.length).toBeGreaterThanOrEqual(4);
    expect(pack.research.length).toBeGreaterThanOrEqual(5);
    expect(pack.research.filter((r) => r.status === "published").length).toBeGreaterThanOrEqual(3);
    expect(pack.research.some((r) => r.zoteroKey === "6K6WPBFQ")).toBe(true);
    expect(pack.research.some((r) => r.zoteroKey === "U7EHXJMV")).toBe(true);
    expect(pack.research.some((r) => r.zoteroKey === "TU7WCKWE")).toBe(true);
    expect(pack.research.filter((r) => r.zoteroKey).length).toBeGreaterThan(100);
    const splash = pack.research.find((r) => r.zoteroKey === "U7EHXJMV")!;
    expect(splash.pillars).toContain("eia");
    expect(splash.geographies).toContain("Mid-Atlantic Splashdown Corridor");
    const oae = pack.research.find((r) => r.zoteroKey === "TU7WCKWE")!;
    expect(oae.pillars).toContain("eia");
    expect(oae.geographies).toContain("North Atlantic OAE Trial Box");
    const mesoPaper = pack.research.find((r) => r.zoteroKey === "6K6WPBFQ")!;
    expect(mesoPaper.pillars).toContain("eia");
    expect(mesoPaper.ifbs).toContain("RFMO");
    expect(mesoPaper.geographies).toContain("NE Atlantic Mesopelagic Belt");
    expect(pack.relatedSystems.length).toBeGreaterThanOrEqual(7);
    expect(pack.cbtmtMatches.length).toBeGreaterThanOrEqual(4);
    expect(csvStorylineCounts().abnjBoxes).toBe(AbnjBox.options.length);
    expect(pack.abnjBoxes).toEqual(abnjBoxesFromFixtureCsv());
    expect(pack.abnjBoxes).toEqual([...AbnjBox.options]);
  });

  it("rich CSV pack — interim MGR, three EIA storylines, published ABMT stub, extended AbnjBox", () => {
    h = createHarness();
    const ids = seedDatabase(h.db);
    const pack = getSeedPack();

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
      const csv = pack.eia.find((e) => act.title === e.title);
      expect(csv).toBeTruthy();
      expect(AbnjBox.safeParse(act.abnjBox).success).toBe(true);
    }
    expect(getEiaActivity(h.db, ids.rich.eia.rocket)!.title).toMatch(/splashdown/i);
    expect(getEiaActivity(h.db, ids.rich.eia.marineCdr)!.title).toMatch(/alkalinity/i);
    expect(getEiaActivity(h.db, ids.rich.eia.mesopelagic)!.title).toMatch(/mesopelagic/i);

    const sargasso = getAbmtProposal(h.db, ids.rich.abmt.sargasso)!;
    expect(sargasso.publicRecordId).toMatch(/^BBNJ-ABMT-/);
    expect(getAbmtProposal(h.db, ids.rich.abmt.crDome)!.publicRecordId).toBeUndefined();

    expect(pack.abnjBoxes).toEqual([...AbnjBox.options]);
    expect(AbnjBox.safeParse("Mid-Atlantic Splashdown Corridor").success).toBe(true);
    expect(AbnjBox.safeParse("NE Atlantic Mesopelagic Belt").success).toBe(true);
    expect(AbnjBox.safeParse("Central Indian Ridge").success).toBe(true);
    expect(AbnjBox.safeParse("Tonga-Kermadec Arc").success).toBe(true);
    expect(AbnjBox.safeParse("Southern Ocean Polar Front").success).toBe(true);

    const hydrothermal = getMgrBatch(h.db, ids.rich.mgr.hydrothermalIndian)!;
    expect(hydrothermal.currentStage).toBe("utilisation");
    expect(hydrothermal.publicRecordId).toMatch(/^BBNJ-MGR-/);
    expect(hydrothermal.sourceChannel).toBe("form");

    const pending = getMgrBatch(h.db, ids.rich.mgr.sargassoPending)!;
    expect(pending.bSbi).toBeTruthy();
    expect(pending.publicRecordId).toBeUndefined();
    expect(pending.sourceChannel).toBe("form");

    const assisted = getMgrBatch(h.db, ids.rich.mgr.assistedSids)!;
    expect(assisted.sourceChannel).toBe("assisted");
    expect(assisted.publicRecordId).toMatch(/^BBNJ-MGR-/);

    const southern = getMgrBatch(h.db, ids.rich.mgr.southernEdna)!;
    expect(southern.confidentiality).toBe("restricted");
    expect(southern.locationHint).toBe("Southern Ocean Polar Front");

    const cable = getEiaActivity(h.db, ids.rich.eia.cableSouthern)!;
    expect(cable.currentStage).toBe("monitoring_review");
    expect(cable.abnjBox).toBe("Southern Ocean Polar Front");
    const secretariat = principalFor(findUserByUsername(h.db, "secretariat")!);
    const cablePacks = packsForActivity(h.db, secretariat, cable.id);
    expect(cablePacks.some((e) => e.stage === "decision_conditions" && e.status === "published")).toBe(true);
    expect(cablePacks.some((e) => e.stage === "monitoring_review" && e.status === "published")).toBe(true);
    const cableBasis = agreementBasisExtrasForRecord(h.db, cable.id);
    expect(cableBasis.extras.some((c) => /Arts 38–40|Art 34/.test(c.article))).toBe(true);

    const vent = getEiaActivity(h.db, ids.rich.eia.ventIndian)!;
    expect(vent.abnjBox).toBe("Central Indian Ridge");
    expect(packsForActivity(h.db, secretariat, vent.id).some((e) => e.stage === "draft_eia" && e.status === "pending")).toBe(true);

    expect(getAbmtProposal(h.db, ids.rich.abmt.indianVents)!.publicRecordId).toBeUndefined();

    // CBTMT facilitation notes + Lock 4 match rows (including mCDR and sequencing pairs)
    expect(ids.rich.cbtmt.matchIds.length).toBeGreaterThanOrEqual(6);
    const allMatches = listMatches(h.db);
    for (const matchId of ids.rich.cbtmt.matchIds) {
      const m = allMatches.find((x) => x.id === matchId)!;
      expect(m).toBeTruthy();
      expect(m.facilitationNote).toBeTruthy();
      expect(m.needId).not.toBe(m.offerId);
    }
    const ruleAgain = suggestMatches(h.db, secretariat, "seed-test-shared-theme-replay");
    expect(ruleAgain.filter((m) => m.created)).toHaveLength(0);

    // Mesopelagic Agreement-basis extras (Zotero 6K6WPBFQ as RFMO-gap / Part IV)
    const meso = getEiaActivity(h.db, ids.rich.eia.mesopelagic)!;
    const basis = agreementBasisExtrasForRecord(h.db, meso.id);
    expect(basis.extras.some((c) => /Part IV|Art 31/.test(c.article))).toBe(true);
    expect(basis.footnotes.some((f) => f.includes("6K6WPBFQ"))).toBe(true);
    expect(provenanceBadgeForRecord(h.db, meso.id)).toBe("Demo scenario");
    expect(provenanceBadgeForRecord(h.db, ids.rich.mgr.interimTemp)).toBe("Interim (DOALOS)");

    // ISA not-undermine caption only on the CCZ precautionary ABMT stub
    const ccz = getAbmtProposal(h.db, ids.rich.abmt.cczPrecaution)!;
    expect(isIsaNotUndermineAbmtRecord(h.db, ccz.id)).toBe(true);
    expect(isIsaNotUndermineAbmtRecord(h.db, sargasso.id)).toBe(false);
    expect(ccz.publicRecordId).toMatch(/^BBNJ-ABMT-/);
    expect(sargasso.abnjBox).toBe("Sargasso Sea Core");
    expect(ccz.abnjBox).toBe("CCZ");

    const publishedResearch = (
      h.db.prepare(`SELECT COUNT(*) AS n FROM research_items WHERE status = 'published'`).get() as { n: number }
    ).n;
    expect(publishedResearch).toBeGreaterThanOrEqual(3);
    const sargassoResearch = listRelatedResearchForAbmt(h.db, sargasso);
    expect(sargassoResearch.length).toBeGreaterThanOrEqual(1);
    expect(sargassoResearch.every((r) => r.geographies.includes("Sargasso Sea Core"))).toBe(true);
    expect(sargassoResearch.some((r) => r.pillars.includes("eia") && !r.pillars.includes("abmt"))).toBe(false);
    const crDome = getAbmtProposal(h.db, ids.rich.abmt.crDome)!;
    const crDomeResearch = listRelatedResearchForAbmt(h.db, crDome);
    expect(crDomeResearch.length).toBeGreaterThanOrEqual(1);
    expect(crDomeResearch.every((r) => r.geographies.includes("Costa Rica Thermal Dome") && r.pillars.includes("abmt"))).toBe(true);
    const cczResearch = listRelatedResearchForAbmt(h.db, ccz);
    expect(cczResearch.some((r) => r.ifbs.includes("ISA"))).toBe(true);

    // Neighbourhood density: ≥2 published EIA in each storyline AbnjBox
    for (const box of [
      getEiaActivity(h.db, ids.rich.eia.rocket)!.abnjBox,
      getEiaActivity(h.db, ids.rich.eia.marineCdr)!.abnjBox,
      meso.abnjBox,
      cable.abnjBox,
      vent.abnjBox,
    ]) {
      const n = (
        h.db
          .prepare(`SELECT COUNT(*) AS n FROM eia_activities WHERE abnj_box = ? AND public_record_id IS NOT NULL`)
          .get(box) as { n: number }
      ).n;
      expect(n).toBeGreaterThanOrEqual(2);
    }

    // Shared outbox: every rich MGR/EIA/ABMT record has at least one event row
    for (const recordId of [
      ids.rich.mgr.interimTemp,
      ids.rich.mgr.genomicsPacific,
      ids.rich.eia.rocket,
      ids.rich.abmt.sargasso,
    ]) {
      const n = (h.db.prepare("SELECT COUNT(*) AS n FROM events WHERE record_id = ?").get(recordId) as { n: number }).n;
      expect(n).toBeGreaterThan(0);
    }

    // Lock 3: no bSbi equals any publicRecordId on the rich pack
    const collisions = h.db
      .prepare(
        `SELECT COUNT(*) AS n FROM mgr_batches
         WHERE b_sbi IS NOT NULL AND public_record_id IS NOT NULL AND b_sbi = public_record_id`,
      )
      .get() as { n: number };
    expect(collisions.n).toBe(0);
  });
});
