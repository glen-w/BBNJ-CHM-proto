import { afterEach, describe, expect, it } from "vitest";

import { seedDatabase, seedIfEmpty } from "@/server/seed";
import { createHarness, type Harness } from "@/test/helpers";

describe("seed I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("seedIfEmpty is a no-op when users already exist", () => {
    h = createHarness();
    const before = (h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    expect(seedIfEmpty(h.db)).toEqual({ seeded: false });
    expect((h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n).toBe(before);
  });

  it("seedDatabase is idempotent when replayed with the same keys", () => {
    h = createHarness();
    const first = seedDatabase(h.db);
    const counts = () => ({
      events: (h.db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n,
      batches: (h.db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n,
      matches: (h.db.prepare("SELECT COUNT(*) AS n FROM cbtmt_matches").get() as { n: number }).n,
    });
    const before = counts();
    const second = seedDatabase(h.db);
    expect(second.mgr.published).toBe(first.mgr.published);
    expect(counts()).toEqual(before);
    expect(first.cbtmt.matchId).toBeTruthy();
  });
});
