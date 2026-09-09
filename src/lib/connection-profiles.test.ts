import { describe, expect, it } from "vitest";

import { CONNECTION_PROFILE_IDS, CONNECTION_PROFILES, connectionProfile, fmtMs, isConnectionProfileId, transferMs } from "@/lib/connection-profiles";

describe("connection profiles (mocked)", () => {
  it("freezes the profile ids and their order", () => {
    expect(CONNECTION_PROFILE_IDS).toEqual(["office", "national4g", "sids3g", "satellite", "offline"]);
    expect(isConnectionProfileId("sids3g")).toBe(true);
    expect(isConnectionProfileId("fibre")).toBe(false);
  });

  it("applies rtt + bytes*8/bps, by direction", () => {
    const office = connectionProfile("office");
    // 25 Mbps down: 1 MB = 8e6 bits / 25e6 bps = 320 ms + 20 ms RTT.
    expect(transferMs(office, 1_000_000, "download")).toBe(340);
    // 5 Mbps up: 8e6 / 5e6 = 1600 ms + 20.
    expect(transferMs(office, 1_000_000, "upload")).toBe(1620);
    expect(transferMs(office, 0, "download")).toBe(20);
  });

  it("offline profile never crosses the wire", () => {
    expect(transferMs(connectionProfile("offline"), 5_000_000, "download")).toBe(0);
    expect(transferMs(connectionProfile("offline"), 5_000_000, "upload")).toBe(0);
  });

  it("is monotone: slower link or larger payload is strictly slower", () => {
    const sids = connectionProfile("sids3g");
    const office = connectionProfile("office");
    expect(transferMs(sids, 40_000, "upload")).toBeGreaterThan(transferMs(office, 40_000, "upload"));
    expect(transferMs(sids, 80_000, "upload")).toBeGreaterThan(transferMs(sids, 40_000, "upload"));
    for (const p of CONNECTION_PROFILES) {
      if (p.id === "offline") continue;
      expect(transferMs(p, 2_000, "download")).toBeGreaterThan(transferMs(p, 1_000, "download"));
    }
  });

  it("rejects nonsense byte counts", () => {
    expect(() => transferMs(connectionProfile("office"), -1, "download")).toThrow();
    expect(() => transferMs(connectionProfile("office"), Number.NaN, "download")).toThrow();
  });

  it("formats durations for the lab table", () => {
    expect(fmtMs(12)).toBe("12 ms");
    expect(fmtMs(1_400)).toBe("1.4 s");
    expect(fmtMs(63_000)).toBe("1 min 03 s");
  });
});
