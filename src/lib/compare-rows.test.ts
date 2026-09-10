import { describe, expect, it } from "vitest";

import { ABOUT_COMPARE_HIGHLIGHTS, INTERIM_AS_OF, buildCompareSections } from "@/lib/compare-rows";

describe("compare interim honesty", () => {
  it("dates interim DOALOS cells as public-page observations", () => {
    expect(INTERIM_AS_OF).toMatch(/Sep 2026/);
    const sections = buildCompareSections({ secretariat: true });
    for (const section of sections) {
      for (const row of section.rows) {
        expect(row.interim).toContain(INTERIM_AS_OF);
      }
    }
    for (const row of ABOUT_COMPARE_HIGHLIGHTS) {
      expect(row.interim).toContain(INTERIM_AS_OF);
    }
  });
});
