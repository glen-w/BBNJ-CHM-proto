import { describe, expect, it } from "vitest";

import { AbnjBox } from "@/lib/contracts/events";
import { ABNJ_SCHEMATIC_NODES, ABNJ_SCHEMATIC_VIEWBOX } from "@/lib/abnj-schematic";

describe("ABNJ schematic", () => {
  it("covers every AbnjBox enum value", () => {
    for (const box of AbnjBox.options) {
      expect(ABNJ_SCHEMATIC_NODES.some((n) => n.box === box)).toBe(true);
    }
  });

  it("keeps every node (and its label offset) inside the viewBox", () => {
    const labelOffset = 8;
    for (const node of ABNJ_SCHEMATIC_NODES) {
      expect(node.x).toBeGreaterThanOrEqual(8);
      expect(node.x).toBeLessThanOrEqual(ABNJ_SCHEMATIC_VIEWBOX.width - 8);
      expect(node.y).toBeGreaterThanOrEqual(12);
      expect(node.y + labelOffset).toBeLessThanOrEqual(ABNJ_SCHEMATIC_VIEWBOX.height - 2);
    }
  });
});
