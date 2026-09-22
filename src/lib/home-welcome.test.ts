import { describe, expect, it } from "vitest";

import {
  HOME_WELCOME_COOKIE,
  HOME_WELCOME_JUMPS,
  homeWelcomeGetStarted,
  homeWelcomeSubmitMode,
  homeWelcomeVisible,
} from "@/lib/home-welcome";

describe("home welcome band preference", () => {
  it("is on by default for non-ops visitors", () => {
    expect(HOME_WELCOME_COOKIE).toBe("chm_home_welcome");
    expect(homeWelcomeVisible(undefined)).toBe(true);
    expect(homeWelcomeVisible(null)).toBe(true);
    expect(homeWelcomeVisible("")).toBe(true);
    expect(homeWelcomeVisible("1")).toBe(true);
  });

  it("hides only on an explicit off value", () => {
    expect(homeWelcomeVisible("0")).toBe(false);
    expect(homeWelcomeVisible("off")).toBe(false);
    expect(homeWelcomeVisible("false")).toBe(false);
  });

  it("default-hides for ops roles when the cookie is absent", () => {
    expect(homeWelcomeVisible(undefined, { opsRole: true })).toBe(false);
    expect(homeWelcomeVisible(null, { opsRole: true })).toBe(false);
    expect(homeWelcomeVisible("", { opsRole: true })).toBe(false);
  });

  it("lets ops force show or hide via cookie", () => {
    expect(homeWelcomeVisible("1", { opsRole: true })).toBe(true);
    expect(homeWelcomeVisible("on", { opsRole: true })).toBe(true);
    expect(homeWelcomeVisible("0", { opsRole: true })).toBe(false);
    expect(homeWelcomeVisible("off", { opsRole: true })).toBe(false);
  });
});

describe("home welcome navigation", () => {
  it("jumps to get started, recent records and about — not a map", () => {
    expect(HOME_WELCOME_JUMPS.map((j) => j.href)).toEqual(["#get-started", "#recent-records", "/about"]);
    expect(HOME_WELCOME_JUMPS.some((j) => /map/i.test(j.label))).toBe(false);
  });

  it("maps submit permissions onto LEARN / SEARCH / SUBMIT cards", () => {
    expect(homeWelcomeSubmitMode(true, true)).toBe("party");
    expect(homeWelcomeSubmitMode(false, true)).toBe("offer");
    expect(homeWelcomeSubmitMode(false, false)).toBe("public");

    const pub = homeWelcomeGetStarted("public");
    expect(pub.map((c) => c.key)).toEqual(["learn", "search", "submit"]);
    expect(pub.find((c) => c.key === "submit")?.links.map((l) => l.href)).toEqual(["/login", "/about"]);

    const party = homeWelcomeGetStarted("party");
    expect(party.find((c) => c.key === "submit")?.links.map((l) => l.href)).toContain("/mgr/new");

    const offer = homeWelcomeGetStarted("offer");
    expect(offer.find((c) => c.key === "submit")?.headerHref).toBe("/capacity");
    expect(offer.find((c) => c.key === "submit")?.links.map((l) => l.href)).toContain("/capacity");

    const learn = homeWelcomeGetStarted("public").find((c) => c.key === "learn");
    expect(learn?.links.map((l) => l.href)).toContain("/about");
    expect(learn?.links.map((l) => l.label)).toEqual([
      "About the Clearing House",
      "The four journeys",
      "Public view",
      "Party receipt (B-SBI)",
      "Secretariat publish + import",
      "STB review",
      "Expression of interest",
    ]);
    expect(learn?.links.map((l) => l.href)).toEqual([
      "/about",
      "#journeys",
      "/",
      "/mgr/new",
      "/mgr/import",
      "/stb",
      "/exhibit",
    ]);
    expect(learn?.links.some((l) => /agreement/i.test(l.label))).toBe(false);
  });

  it("resolves guided path record links when seed ids are provided", () => {
    const learn = homeWelcomeGetStarted("public", { mgrA: "mgr-seed", eia2: "eia-seed" }).find((c) => c.key === "learn");
    expect(learn?.links.map((l) => l.href)).toContain("/mgr/mgr-seed");
    expect(learn?.links.map((l) => l.href)).toContain("/eia/eia-seed");
  });
});
