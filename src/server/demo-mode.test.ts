import { describe, expect, it } from "vitest";

import { readOnlyDemoBlocksAction, readOnlyDemoEnabled } from "@/server/demo-mode";

describe("readOnlyDemoEnabled", () => {
  it("is on only when READ_ONLY_DEMO=1", () => {
    expect(readOnlyDemoEnabled({})).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "0" })).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "true" })).toBe(false);
    expect(readOnlyDemoEnabled({ READ_ONLY_DEMO: "1" })).toBe(true);
  });
});

describe("readOnlyDemoBlocksAction", () => {
  it("blocks writes but not secretariat read actions", () => {
    expect(readOnlyDemoBlocksAction("publish")).toBe(true);
    expect(readOnlyDemoBlocksAction("import")).toBe(true);
    expect(readOnlyDemoBlocksAction("view_full_audit")).toBe(false);
    expect(readOnlyDemoBlocksAction("export_full")).toBe(false);
  });
});
