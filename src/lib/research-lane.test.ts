import { describe, expect, it } from "vitest";

import { RESEARCH_LANE_META_KEY, RESEARCH_NAV_HREF, researchLaneEnabled } from "@/lib/research-lane";

describe("research lane gate", () => {
  it("uses the meta key research_lane_enabled and defaults on", () => {
    expect(RESEARCH_LANE_META_KEY).toBe("research_lane_enabled");
    expect(RESEARCH_NAV_HREF).toBe("/research");
    expect(researchLaneEnabled(undefined)).toBe(true);
    expect(researchLaneEnabled(null)).toBe(true);
    expect(researchLaneEnabled("")).toBe(true);
    expect(researchLaneEnabled("1")).toBe(true);
    expect(researchLaneEnabled("on")).toBe(true);
  });

  it("hides only on an explicit off value", () => {
    expect(researchLaneEnabled("0")).toBe(false);
    expect(researchLaneEnabled("off")).toBe(false);
    expect(researchLaneEnabled("false")).toBe(false);
  });
});
