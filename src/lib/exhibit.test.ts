import { describe, expect, it } from "vitest";

import { EXHIBIT_LIMITS, EXHIBIT_LOGINS, EXHIBIT_SECTIONS, SEARCH_SUGGESTIONS } from "@/lib/exhibit";

describe("evaluator exhibit", () => {
  it("covers the three Session-1 functions and five logins", () => {
    expect(EXHIBIT_SECTIONS).toHaveLength(3);
    expect(EXHIBIT_SECTIONS.map((s) => s.title).join(" ")).toMatch(/Receipt/);
    expect(EXHIBIT_SECTIONS.map((s) => s.title).join(" ")).toMatch(/notification/i);
    expect(EXHIBIT_SECTIONS.map((s) => s.title).join(" ")).toMatch(/User management/);
    expect(EXHIBIT_LOGINS.map((l) => l.username)).toEqual([
      "party.nfp",
      "secretariat",
      "public",
      "stb",
      "nonstate.uploader",
    ]);
    expect(EXHIBIT_LIMITS.some((l) => /hosted public URL/i.test(l))).toBe(true);
    expect(EXHIBIT_LIMITS.some((l) => /SMTP/i.test(l))).toBe(true);
  });

  it("points search suggestions at the varied seed storylines", () => {
    expect(SEARCH_SUGGESTIONS.map((s) => s.q)).toEqual(
      expect.arrayContaining(["TEMP", "utilisation", "mesopelagic", "sequencing", "Sargasso", "Polar Front"]),
    );
    const polar = SEARCH_SUGGESTIONS.find((s) => s.q === "Polar Front");
    expect(polar?.why).not.toMatch(/restricted/i);
  });
});
