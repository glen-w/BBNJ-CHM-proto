import { describe, expect, it } from "vitest";

import { abmtListCaption, eiaListCaption, listAudienceFromRoles, mgrListCaption } from "@/lib/list-captions";

describe("listAudienceFromRoles", () => {
  it("treats anonymous, public and non-state as public readers", () => {
    expect(listAudienceFromRoles(undefined)).toBe("public");
    expect(listAudienceFromRoles([])).toBe("public");
    expect(listAudienceFromRoles(["public"])).toBe("public");
    expect(listAudienceFromRoles(["non_state_uploader"])).toBe("public");
  });

  it("treats party and secretariat as operators", () => {
    expect(listAudienceFromRoles(["party"])).toBe("operator");
    expect(listAudienceFromRoles(["secretariat"])).toBe("operator");
  });

  it("keeps STB distinct so pending packs are not named as visible", () => {
    expect(listAudienceFromRoles(["stb"])).toBe("stb");
  });
});

describe("role-aware list captions", () => {
  it("does not name pending or restricted MGR records for public readers", () => {
    const publicCopy = mgrListCaption("public", 5);
    expect(publicCopy).toMatch(/published, public-tier only/);
    expect(publicCopy).not.toMatch(/pending Sargasso/i);
    expect(publicCopy).not.toMatch(/restricted Polar Front/i);
    expect(mgrListCaption("operator", 11)).toMatch(/pending Sargasso/);
    expect(mgrListCaption("stb", 8)).toMatch(/restricted Polar Front/);
    expect(mgrListCaption("stb", 8)).not.toMatch(/pending Sargasso/);
  });

  it("does not name a pending EIA draft for public readers", () => {
    expect(eiaListCaption("public", 12)).not.toMatch(/pending draft/i);
    expect(eiaListCaption("operator", 15)).toMatch(/pending draft EIA/);
    expect(eiaListCaption("stb", 13)).toMatch(/not visible until the Secretariat publishes/);
  });

  it("does not name pending ABMT candidates for public readers", () => {
    expect(abmtListCaption("public", 2)).toMatch(/Published stubs only/);
    expect(abmtListCaption("public", 2)).not.toMatch(/Costa Rica Dome/);
    expect(abmtListCaption("public", 2)).not.toMatch(/visible to your role\. visible/);
    expect(abmtListCaption("operator", 4)).toMatch(/Costa Rica Dome/);
    expect(abmtListCaption("operator", 4)).toMatch(/Indian Ridge/);
  });
});
