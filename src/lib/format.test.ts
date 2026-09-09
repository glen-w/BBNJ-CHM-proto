import { afterEach, describe, expect, it, vi } from "vitest";

import { DOMAIN_LABEL, domainPath, fmtDate, fmtRelative, stageLabel } from "@/lib/format";

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

describe("fmtRelative", () => {
  afterEach(() => vi.useRealTimers());

  it("returns em dash / passthrough for missing or bad input", () => {
    expect(fmtRelative(undefined)).toBe("—");
    expect(fmtRelative("not-a-date")).toBe("not-a-date");
  });

  it("formats compact relative buckets from a fixed now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T12:00:00.000Z"));
    expect(fmtRelative("2026-09-09T11:59:30.000Z")).toBe("just now");
    expect(fmtRelative("2026-09-09T11:58:30.000Z")).toBe("1 min ago");
    expect(fmtRelative("2026-09-09T11:30:00.000Z")).toBe("30 min ago");
    expect(fmtRelative("2026-09-09T10:30:00.000Z")).toBe("1 hr ago");
    expect(fmtRelative("2026-09-09T08:00:00.000Z")).toBe("4 hr ago");
    expect(fmtRelative("2026-09-08T12:00:00.000Z")).toBe("1 day ago");
    expect(fmtRelative("2026-09-06T12:00:00.000Z")).toBe("3 days ago");
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
    expect(domainPath("abmt", "abc")).toBe("/abmt/abc");
    expect(DOMAIN_LABEL.cbtmt).toBe("CBTMT");
  });
});
