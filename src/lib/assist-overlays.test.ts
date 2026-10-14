import { describe, expect, it } from "vitest";

import { ASSIST_OVERLAYS_META_KEY, assistOverlaysEnabled } from "@/lib/assist-overlays";
import type { ResearchItem } from "@/lib/contracts/extensions";
import { abmtSeedShowsGfwOverlay } from "@/lib/gfw-overlay";
import { abmtSeedShowsIsaCczOverlay } from "@/lib/isa-overlay";
import { buildResearchGraph } from "@/lib/research-graph";
import { featuresForAbnjBox, parseVmeGeoJson } from "@/lib/rfmo-vme";

describe("assist overlays gate", () => {
  it("defaults off unless explicitly on", () => {
    expect(ASSIST_OVERLAYS_META_KEY).toBe("assist_overlays_enabled");
    expect(assistOverlaysEnabled(undefined)).toBe(false);
    expect(assistOverlaysEnabled("0")).toBe(false);
    expect(assistOverlaysEnabled("1")).toBe(true);
  });
});

describe("research graph", () => {
  it("does not link on pillar alone", () => {
    const papers: ResearchItem[] = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "A",
        status: "published",
        pillars: ["eia"],
        geographies: [],
        ifbs: [],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        title: "B",
        status: "published",
        pillars: ["eia"],
        geographies: ["CCZ"],
        ifbs: [],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const graph = buildResearchGraph(papers);
    expect(graph.links).toHaveLength(0);
  });

  it("links papers that share a place tag", () => {
    const papers: ResearchItem[] = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "A",
        status: "published",
        pillars: ["eia"],
        geographies: ["CCZ"],
        ifbs: [],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        title: "B",
        status: "published",
        pillars: ["mgr"],
        geographies: ["CCZ"],
        ifbs: [],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const graph = buildResearchGraph(papers);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].reason).toBe("geography");
  });
});

describe("vme geojson", () => {
  it("filters layers by abnj box", () => {
    const fc = parseVmeGeoJson({
      features: [
        {
          properties: { layerId: "neafc", rfmo: "NEAFC", label: "x" },
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        },
      ],
    });
    expect(featuresForAbnjBox(fc, "NE Atlantic Mesopelagic Belt")).toHaveLength(1);
    expect(featuresForAbnjBox(fc, "Sargasso Sea Core")).toHaveLength(0);
  });
});

describe("gfw abmt overlay seeds", () => {
  it("covers fisheries-context ABMT stubs and leaves the ISA CCZ example to its own map", () => {
    expect(abmtSeedShowsGfwOverlay("abmt-sargasso")).toBe(true);
    expect(abmtSeedShowsGfwOverlay("abmt-cr-dome")).toBe(true);
    expect(abmtSeedShowsGfwOverlay("abmt-indian-vents")).toBe(true);
    expect(abmtSeedShowsGfwOverlay("abmt-ccz-precaution")).toBe(false);
    expect(abmtSeedShowsGfwOverlay(undefined)).toBe(false);
  });
});

describe("isa ccz abmt overlay seeds", () => {
  it("covers only the CCZ precautionary stub", () => {
    expect(abmtSeedShowsIsaCczOverlay("abmt-ccz-precaution")).toBe(true);
    expect(abmtSeedShowsIsaCczOverlay("abmt-sargasso")).toBe(false);
    expect(abmtSeedShowsIsaCczOverlay(undefined)).toBe(false);
  });
});
