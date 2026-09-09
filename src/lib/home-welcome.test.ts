import { describe, expect, it } from "vitest";

import {
  HOME_WELCOME_COOKIE,
  HOME_WELCOME_JUMPS,
  homeWelcomeGetStarted,
  homeWelcomeSubmitMode,
  homeWelcomeVisible,
} from "@/lib/home-welcome";

describe("home welcome band preference", () => {
  it("is on by default", () => {
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
});

describe("home welcome navigation", () => {
  it("jumps to get started, recent records and about — not a map", () => {
    expect(HOME_WELCOME_JUMPS.map((j) => j.href)).toEqual(["#get-started", "#recent-records", "#about-desk"]);
    expect(HOME_WELCOME_JUMPS.some((j) => /map/i.test(j.label))).toBe(false);
  });

  it("maps submit permissions onto LEARN / SEARCH / SUBMIT cards", () => {
    expect(homeWelcomeSubmitMode(true, true)).toBe("party");
    expect(homeWelcomeSubmitMode(false, true)).toBe("offer");
    expect(homeWelcomeSubmitMode(false, false)).toBe("public");

    const pub = homeWelcomeGetStarted("public");
    expect(pub.map((c) => c.key)).toEqual(["learn", "search", "submit"]);
    expect(pub.find((c) => c.key === "submit")?.links.map((l) => l.href)).toEqual(["/login", "#about-desk"]);

    const party = homeWelcomeGetStarted("party");
    expect(party.find((c) => c.key === "submit")?.links.map((l) => l.href)).toContain("/mgr/new");

    const offer = homeWelcomeGetStarted("offer");
    expect(offer.find((c) => c.key === "submit")?.headerHref).toBe("/capacity");
    expect(offer.find((c) => c.key === "submit")?.links.map((l) => l.href)).toContain("/capacity");
  });
});
