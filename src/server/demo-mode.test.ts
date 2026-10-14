import { describe, expect, it } from "vitest";

import { readOnlyDemoEnabled } from "@/server/demo-mode";

describe("readOnlyDemoEnabled", () => {
  it("is on only when READ_ONLY_DEMO=1", () => {
    expect(readOnlyDemoEnabled({})).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "0" })).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "true" })).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "1" })).toBe(true);
  });
});
