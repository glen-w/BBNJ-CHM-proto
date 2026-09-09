import { describe, expect, it } from "vitest";

import { HOME_WELCOME_COOKIE, homeWelcomeVisible } from "@/lib/home-welcome";

describe("home welcome band preference", () => {
  it("is on by default", () => {
    expect(HOME_WELCOME_COOKIE).toBe("chm_home_welcome");
    expect(homeWelcomeVisible(undefined)).toBe(true);
    expect(homeWelcomeVisible(null)).toBe(true);
    expect(homeWelcomeVisible("1")).toBe(true);
    expect(homeWelcomeVisible("on")).toBe(true);
  });

  it("hides only on an explicit off value", () => {
    expect(homeWelcomeVisible("0")).toBe(false);
    expect(homeWelcomeVisible("off")).toBe(false);
    expect(homeWelcomeVisible("false")).toBe(false);
  });
});
