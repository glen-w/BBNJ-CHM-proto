import { afterEach, describe, expect, it } from "vitest";

import { createCbtmtRecord } from "@/server/cbtmt";
import { listDigestRuns, runDigests } from "@/server/digest";
import { addEiaPack, createEiaActivity } from "@/server/eia";
import { receivePreCollection } from "@/server/mgr";
import { publishPack } from "@/server/packs";
import { upsertSubscription } from "@/server/queries";
import { SEED_USERS } from "@/server/seed";
import { VALID_MGR, createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("runDigests / listDigestRuns I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("requires run_digest capability when an actor is provided", () => {
    h = createHarness();
    expectDomainCode(() => runDigests(h.db, { actor: h.party() }), "forbidden");
    expectDomainCode(() => runDigests(h.db, { actor: h.pub() }), "forbidden");
    expect(() => runDigests(h.db, { actor: h.secretariat() })).not.toThrow();
  });

  it("skips immediate subscribers and rolls up matching published events for daily subscribers", () => {
    h = createHarness();
    const dailyUser = SEED_USERS[2]; // public user
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000d001",
      userId: dailyUser.id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "daily",
    });

    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key(), { at: "2026-09-01T10:00:00.000Z" });
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection", at: "2026-09-01T11:00:00.000Z" });

    // Immediate dispatch did NOT notify dailyUser
    const notifsBefore = h.db
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?")
      .get(dailyUser.id) as { n: number };
    expect(notifsBefore.n).toBe(0);

    const run = runDigests(h.db, { now: "2026-09-02T00:00:00.000Z" });
    expect(run.inserted).toBeGreaterThanOrEqual(1);
    const userRes = run.users.find((u) => u.userId === dailyUser.id);
    expect(userRes?.inserted).toBe(true);
    expect(userRes?.eventCount).toBe(1);

    const digestNotif = h.db
      .prepare("SELECT * FROM notifications WHERE user_id = ? AND kind = 'digest'")
      .get(dailyUser.id) as { summary: string; kind: string };
    expect(digestNotif).toBeDefined();
    expect(digestNotif.summary).toMatch(/Daily digest: 1 published pack — MGR 1/);
  });

  it("second run with no new events is a no-op", () => {
    h = createHarness();
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000d002",
      userId: SEED_USERS[2].id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "daily",
    });
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key(), { at: "2026-09-01T10:00:00.000Z" });
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection", at: "2026-09-01T11:00:00.000Z" });

    const first = runDigests(h.db, { now: "2026-09-02T00:00:00.000Z" });
    expect(first.inserted).toBeGreaterThanOrEqual(1);

    const second = runDigests(h.db, { now: "2026-09-02T01:00:00.000Z" });
    const userRes = second.users.find((u) => u.userId === SEED_USERS[2].id);
    expect(userRes?.inserted).toBe(false);
    expect(userRes?.skipped).toBe("no_events");
  });

  it("respects onlyDue when running on a cadence schedule", () => {
    h = createHarness();
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000d003",
      userId: SEED_USERS[2].id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "daily",
    });
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key(), { at: "2026-09-01T10:00:00.000Z" });
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection", at: "2026-09-01T11:00:00.000Z" });

    runDigests(h.db, { now: "2026-09-02T00:00:00.000Z" });

    // Add another event 1 hour later
    const rec2 = receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Cruise 2" }, "form", h.key(), { at: "2026-09-02T00:30:00.000Z" });
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec2.batch.id, stage: "pre_collection", at: "2026-09-02T00:45:00.000Z" });

    // Running with onlyDue after 1 hour skips because 24 hours have not elapsed
    const dueCheck = runDigests(h.db, { now: "2026-09-02T01:00:00.000Z", onlyDue: true });
    const userRes = dueCheck.users.find((u) => u.userId === SEED_USERS[2].id);
    expect(userRes?.skipped).toBe("not_due");

    // Running 25 hours later is due and succeeds
    const dueLater = runDigests(h.db, { now: "2026-09-03T02:00:00.000Z", onlyDue: true });
    const userRes2 = dueLater.users.find((u) => u.userId === SEED_USERS[2].id);
    expect(userRes2?.inserted).toBe(true);
    expect(userRes2?.eventCount).toBe(1);
  });

  it("filters out restricted events for subscribers who cannot view them", () => {
    h = createHarness();
    const publicUser = SEED_USERS[2];
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000d004",
      userId: publicUser.id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "daily",
    });

    const restricted = receivePreCollection(
      h.db,
      h.party(),
      { ...VALID_MGR, title: "Secret Cruise", confidentiality: "restricted" },
      "form",
      h.key(),
      { at: "2026-09-01T10:00:00.000Z" },
    );
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: restricted.batch.id, stage: "pre_collection", at: "2026-09-01T11:00:00.000Z" });

    const run = runDigests(h.db, { now: "2026-09-02T00:00:00.000Z" });
    const userRes = run.users.find((u) => u.userId === publicUser.id);
    expect(userRes?.skipped).toBe("no_events");
  });

  it("aggregates multiple domains into the digest summary", () => {
    h = createHarness();
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000d005",
      userId: SEED_USERS[2].id,
      themes: ["taxonomy"],
      abnjBoxes: ["CCZ"],
      domains: ["mgr", "eia", "cbtmt"],
      digest: "daily",
    });

    const m = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key(), { at: "2026-09-01T10:00:00.000Z" });
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: m.batch.id, stage: "pre_collection", at: "2026-09-01T11:00:00.000Z" });

    const e = createEiaActivity(h.db, h.party(), { title: "EIA CCZ", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), e.activity.id, "screening", "Screening outcome", h.key(), { screeningOutcome: "no_eia" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening", at: "2026-09-01T12:00:00.000Z" });

    const c = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Need Taxonomy", themes: "taxonomy" }, h.key());
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: c.record.id, stage: "need_posted", at: "2026-09-01T13:00:00.000Z" });

    const run = runDigests(h.db, { now: "2026-09-02T00:00:00.000Z" });
    const userRes = run.users.find((u) => u.userId === SEED_USERS[2].id);
    expect(userRes?.eventCount).toBe(3);

    const rows = listDigestRuns(h.db);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].username).toBe(SEED_USERS[2].username);
  });
});
