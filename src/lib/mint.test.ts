import { describe, expect, it } from "vitest";

import { MINT_KINDS, parseMinted } from "@/lib/mint";

describe("mint kinds", () => {
  it("parses minted query values", () => {
    expect(parseMinted("bSbi")).toBe("bSbi");
    expect(parseMinted("publicRecordId")).toBe("publicRecordId");
    expect(parseMinted("nope")).toBeUndefined();
  });

  it("mgr includes B-SBI step", () => {
    expect(MINT_KINDS.mgr).toContain("bSbi");
    expect(MINT_KINDS.default).not.toContain("bSbi");
  });
});
