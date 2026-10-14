import { describe, expect, it } from "vitest";

import { ASSIST_OVERLAYS_META_KEY, assistOverlaysEnabled } from "@/lib/assist-overlays";
import type { ResearchItem } from "@/lib/contracts/extensions";
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
  it("links papers that share a pillar", () => {
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
    expect(
      graph.links.some(
        (l) =>
          l.source === "00000000-0000-4000-8000-000000000001" && l.target === "00000000-0000-4000-8000-000000000002",
      ),
    ).toBe(true);
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
