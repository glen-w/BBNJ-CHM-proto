import { describe, expect, it } from "vitest";

import { AbnjBox } from "@/lib/contracts/events";
import { ABNJ_SCHEMATIC_NODES } from "@/lib/abnj-schematic";

describe("ABNJ schematic", () => {
  it("covers every AbnjBox enum value", () => {
    for (const box of AbnjBox.options) {
      expect(ABNJ_SCHEMATIC_NODES.some((n) => n.box === box)).toBe(true);
    }
  });
});
