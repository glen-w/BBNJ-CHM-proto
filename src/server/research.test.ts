import { afterEach, describe, expect, it } from "vitest";

import { RESEARCH_LANE_META_KEY } from "@/lib/research-lane";
import { createAbmtProposal } from "@/server/abmt";
import {
  isResearchLaneEnabled,
  listRelatedResearchForAbmt,
  listRelatedResearchForPillar,
  openHrefForResearch,
  setResearchLaneEnabled,
  upsertResearchItem,
} from "@/server/research";
import { createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("research items", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("upserts by zotero_key and is idempotent", () => {
    h = createHarness();
    const first = upsertResearchItem(h.db, {
      zoteroKey: "ABC123",
      title: "A paper",
      year: 2021,
      status: "published",
      pillars: ["abmt"],
      geographies: ["Sargasso Sea Core"],
      ifbs: [],
      oaUrl: "https://example.org/oa",
    });
    expect(first.created).toBe(true);
    const second = upsertResearchItem(h.db, {
      zoteroKey: "ABC123",
      title: "A paper (updated)",
      year: 2021,
      status: "published",
      pillars: ["abmt"],
      geographies: ["Sargasso Sea Core"],
      ifbs: [],
      oaUrl: "https://example.org/oa",
    });
    expect(second.created).toBe(false);
    expect(second.item.id).toBe(first.item.id);
    expect(second.item.title).toBe("A paper (updated)");
    expect(openHrefForResearch(second.item)).toBe("https://example.org/oa");
  });

  it("rejects an empty title", () => {
    h = createHarness();
    expectDomainCode(
      () =>
        upsertResearchItem(h.db, {
          title: "  ",
          status: "published",
          pillars: ["abmt"],
          geographies: [],
          ifbs: [],
        }),
      "validation",
    );
  });

  it("relates ABMT records by shared geography, not implicit pillar alone", () => {
    h = createHarness();
    const sargasso = createAbmtProposal(h.db, h.party(), { title: "Sargasso stub", abnjBox: "Sargasso Sea Core" }, h.key()).proposal;
    const ccz = createAbmtProposal(h.db, h.party(), { title: "CCZ stub", abnjBox: "CCZ" }, h.key()).proposal;
    const noBox = createAbmtProposal(h.db, h.party(), { title: "Form stub" }, h.key()).proposal;

    upsertResearchItem(h.db, {
      title: "Sargasso MPA note",
      year: 2021,
      status: "published",
      pillars: ["abmt"],
      geographies: ["Sargasso Sea Core"],
      ifbs: [],
    });
    upsertResearchItem(h.db, {
      title: "CCZ ISA note",
      year: 2024,
      status: "published",
      pillars: ["abmt"],
      geographies: ["CCZ"],
      ifbs: ["ISA"],
      doi: "10.1000/ccz",
    });
    upsertResearchItem(h.db, {
      title: "Mesopelagic EIA paper",
      year: 2021,
      status: "published",
      pillars: ["eia"],
      geographies: ["NE Atlantic Mesopelagic Belt"],
      ifbs: ["RFMO"],
    });
    upsertResearchItem(h.db, {
      title: "Draft ABMT paper",
      status: "draft",
      pillars: ["abmt"],
      geographies: ["Sargasso Sea Core"],
      ifbs: [],
    });

    const sargassoHits = listRelatedResearchForAbmt(h.db, sargasso);
    expect(sargassoHits.map((i) => i.title)).toEqual(["Sargasso MPA note"]);
    const cczHits = listRelatedResearchForAbmt(h.db, ccz);
    expect(cczHits.map((i) => i.title)).toEqual(["CCZ ISA note"]);
    expect(openHrefForResearch(cczHits[0]!)).toBe("https://doi.org/10.1000/ccz");
    expect(listRelatedResearchForAbmt(h.db, noBox)).toEqual([]);
    expect(listRelatedResearchForPillar(h.db, "eia", "NE Atlantic Mesopelagic Belt").map((i) => i.title)).toEqual(["Mesopelagic EIA paper"]);
    expect(listRelatedResearchForPillar(h.db, "mgr", "NE Atlantic Mesopelagic Belt")).toEqual([]);
    expect(listRelatedResearchForPillar(h.db, "eia", "not a box")).toEqual([]);
    expect(listRelatedResearchForPillar(h.db, "mgr", undefined)).toEqual([]);
  });

  it("defaults the lane on and hides when meta is 0", () => {
    h = createHarness();
    expect(isResearchLaneEnabled(h.db)).toBe(true);
    setResearchLaneEnabled(h.db, false);
    const stored = h.db.prepare("SELECT value FROM meta WHERE key = ?").get(RESEARCH_LANE_META_KEY) as { value: string };
    expect(stored.value).toBe("0");
    expect(isResearchLaneEnabled(h.db)).toBe(false);
    setResearchLaneEnabled(h.db, true);
    expect(isResearchLaneEnabled(h.db)).toBe(true);
  });
});
