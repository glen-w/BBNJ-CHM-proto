import { describe, expect, it } from "vitest";

import { DOMAIN_LABEL, domainPath, fmtDate, stageLabel } from "@/lib/format";

describe("fmtDate", () => {
  it("renders a valid ISO timestamp in UTC", () => {
    expect(fmtDate("2026-09-01T10:00:00.000Z")).toBe("2026-09-01 10:00Z");
  });

  it("returns an em dash for missing values", () => {
    expect(fmtDate(undefined)).toBe("—");
  });

  it("passes through unparseable strings", () => {
    expect(fmtDate("not-a-date")).toBe("not-a-date");
  });
});

describe("stageLabel / domainPath", () => {
  it("replaces underscores in stage names", () => {
    expect(stageLabel("pre_collection")).toBe("pre collection");
  });

  it("maps each domain to its list/detail path", () => {
    expect(domainPath("mgr", "abc")).toBe("/mgr/abc");
    expect(domainPath("eia", "abc")).toBe("/eia/abc");
    expect(domainPath("cbtmt", "abc")).toBe("/capacity/abc");
    expect(domainPath("abmt", "abc")).toBe("/abmt");
    expect(DOMAIN_LABEL.cbtmt).toBe("CBTMT");
  });
});
