import { afterEach, describe, expect, it } from "vitest";

import { createHarness, type Harness } from "@/test/helpers";
import {
  corpusChunks,
  isAssistOverlaysEnabled,
  localCorpusAsk,
  researchGraphForDesk,
  setAssistOverlaysEnabled,
  vmeFeaturesForBox,
} from "./assist-overlays";
import { upsertResearchItem } from "./research";

describe("assist overlays meta", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("persists on and off", () => {
    h = createHarness();
    expect(isAssistOverlaysEnabled(h.db)).toBe(false);
    setAssistOverlaysEnabled(h.db, true);
    expect(isAssistOverlaysEnabled(h.db)).toBe(true);
    setAssistOverlaysEnabled(h.db, false);
    expect(isAssistOverlaysEnabled(h.db)).toBe(false);
  });

  it("finds treaty excerpts by keyword", () => {
    h = createHarness();
    const hits = localCorpusAsk(h.db, "cumulative impacts screening", "treaty");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.source).toBe("treaty");
  });
});

describe("vme fixtures", () => {
  it("loads mesopelagic belt layers", () => {
    const features = vmeFeaturesForBox("NE Atlantic Mesopelagic Belt");
    expect(features.length).toBeGreaterThanOrEqual(1);
    expect(features.some((f) => f.rfmo === "NEAFC")).toBe(true);
  });
});

describe("corpus chunks", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("includes treaty excerpts and literature after seed", () => {
    h = createHarness();
    const chunks = corpusChunks(h.db);
    expect(chunks.some((c) => c.source === "treaty")).toBe(true);
    upsertResearchItem(h.db, {
      zoteroKey: "DEEPTEST",
      title: "Deep test paper",
      status: "published",
      pillars: ["eia"],
      geographies: [],
      ifbs: [],
      summarySnippet: "mesopelagic RFMO gap",
    });
    const again = corpusChunks(h.db);
    expect(again.some((c) => c.title === "Deep test paper")).toBe(true);
  });
});

describe("research graph for desk", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("returns nodes from published research", () => {
    h = createHarness();
    upsertResearchItem(h.db, {
      zoteroKey: "GRAPH1",
      title: "Graph node paper",
      status: "published",
      pillars: ["eia"],
      geographies: ["CCZ"],
      ifbs: [],
    });
    const graph = researchGraphForDesk(h.db);
    expect(graph.nodes.length).toBe(1);
  });
});
