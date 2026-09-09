import { afterEach, describe, expect, it } from "vitest";

import { Event } from "@/lib/contracts/events";
import { DEMO_COMMENT_WINDOW_DAYS, type StoredEvent } from "@/lib/contracts/extensions";
import { addEiaPack, createEiaActivity, setEiaDueAt } from "@/server/eia";
import { receivePreCollection } from "@/server/mgr";
import {
  dispatch,
  eventVisibleTo,
  publishSummaryOf,
  replayOutbox,
  subscriptionMatches,
} from "@/server/notify";
import { insertEvent } from "@/server/outbox";
import { publishPack } from "@/server/packs";
import { upsertSubscription } from "@/server/queries";
import { SEED_USERS } from "@/server/seed";
import { VALID_MGR, createHarness, type Harness } from "@/test/helpers";

describe("subscriptionMatches / publishSummaryOf", () => {
  const sub = (over: { domains?: string[]; boxes?: string[]; themes?: string[] }) => ({
    themes_json: JSON.stringify(over.themes ?? []),
    abnj_boxes_json: JSON.stringify(over.boxes ?? []),
    domains_json: JSON.stringify(over.domains ?? []),
  });

  it("matches on domain, ABNJ box, or shared theme", () => {
    expect(subscriptionMatches(sub({ domains: ["mgr"] }), "mgr", {})).toBe(true);
    expect(subscriptionMatches(sub({ boxes: ["CCZ"] }), "eia", { abnjBox: "CCZ" })).toBe(true);
    expect(subscriptionMatches(sub({ themes: ["taxonomy"] }), "cbtmt", { themes: ["taxonomy", "genomics"] })).toBe(true);
    expect(subscriptionMatches(sub({ domains: ["eia"] }), "mgr", {})).toBe(false);
  });

  it("labels amendments as material or editorial", () => {
    const event = {
      domain: "mgr",
      stage: "pre_collection",
      version: 2,
      materialChange: true,
      changeNote: "New area",
      publicRecordId: "BBNJ-MGR-2026-00001",
    } as StoredEvent;
    const meta = { title: "Cruise", publicRecordId: "BBNJ-MGR-2026-00001" as string | undefined };
    expect(publishSummaryOf(event, meta)).toMatch(/material change/);
    expect(publishSummaryOf({ ...event, materialChange: false, changeNote: undefined }, meta)).toMatch(/editorial/);
    expect(publishSummaryOf({ ...event, version: 1 }, meta)).toMatch(/published —/);
  });
});

describe("dispatch I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("skips non-published events and missing ids", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    expect(dispatch(h.db, rec.event.id)).toEqual({ eventId: rec.event.id, inserted: 0, recipients: 0 });
    const missing = crypto.randomUUID();
    expect(dispatch(h.db, missing)).toEqual({ eventId: missing, inserted: 0, recipients: 0, error: "event not found" });
  });

  it("notifies the owner immediately and holds daily subscribers", () => {
    h = createHarness();
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000a010",
      userId: SEED_USERS[2].id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "daily",
    });
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000a011",
      userId: SEED_USERS[3].id,
      themes: [],
      abnjBoxes: [],
      domains: ["mgr"],
      digest: "immediate",
    });
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    const pub = publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    const kinds = h.db
      .prepare("SELECT user_id, kind FROM notifications WHERE event_id = ?")
      .all(pub.event.id) as { user_id: string; kind: string }[];
    expect(kinds.some((k) => k.user_id === SEED_USERS[0].id && k.kind === "publish")).toBe(true);
    expect(kinds.some((k) => k.user_id === SEED_USERS[3].id && k.kind === "publish")).toBe(true);
    expect(kinds.some((k) => k.user_id === SEED_USERS[2].id)).toBe(false);

    const replay = dispatch(h.db, pub.event.id);
    expect(replay.inserted).toBe(0);
    expect(replayOutbox(h.db).inserted).toBe(0);
    expect(eventVisibleTo(h.db, SEED_USERS[2], pub.event.id)).toBe(true);
  });

  it("fans out stb_review and deadline on a published draft EIA", () => {
    h = createHarness();
    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000a012",
      userId: SEED_USERS[2].id,
      themes: [],
      abnjBoxes: ["CCZ"],
      domains: [],
      digest: "immediate",
    });
    const act = createEiaActivity(h.db, h.party(), { title: "CCZ EIA", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), act.activity.id, "screening", "required", h.key(), { screeningOutcome: "eia_required" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "screening" });
    addEiaPack(h.db, h.party(), act.activity.id, "draft_eia", "Draft", h.key());
    const pub = publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "draft_eia" });
    const rows = h.db
      .prepare("SELECT user_id, kind, summary FROM notifications WHERE event_id = ?")
      .all(pub.event.id) as { user_id: string; kind: string; summary: string }[];
    expect(rows.some((r) => r.user_id === SEED_USERS[3].id && r.kind === "stb_review")).toBe(true);
    expect(rows.some((r) => r.kind === "deadline" && r.summary.includes(String(DEMO_COMMENT_WINDOW_DAYS)))).toBe(true);
    expect(rows.some((r) => r.user_id === SEED_USERS[2].id && r.kind === "deadline")).toBe(true);
  });

  it("uses explicit dueAt in the deadline summary when set", () => {
    h = createHarness();
    const act = createEiaActivity(h.db, h.party(), { title: "DueAt EIA", abnjBox: "CCZ" }, h.key());
    setEiaDueAt(h.db, h.party(), act.activity.id, "2026-11-01T00:00:00.000Z");
    addEiaPack(h.db, h.party(), act.activity.id, "screening", "required", h.key(), { screeningOutcome: "eia_required" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "screening" });
    addEiaPack(h.db, h.party(), act.activity.id, "draft_eia", "Draft", h.key());
    const pub = publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "draft_eia" });
    const rows = h.db
      .prepare("SELECT summary FROM notifications WHERE event_id = ? AND kind = 'deadline'")
      .all(pub.event.id) as { summary: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.summary.includes("2026-11-01") && r.summary.includes("explicit dueAt"))).toBe(true);
    expect(rows.some((r) => r.summary.includes(`${DEMO_COMMENT_WINDOW_DAYS}-day`))).toBe(false);
  });

  it("logs a dispatch error instead of throwing when the record is missing", () => {
    h = createHarness();
    const orphan = insertEvent(
      h.db,
      Event.parse({
        id: crypto.randomUUID(),
        domain: "mgr",
        stage: "pre_collection",
        status: "published",
        recordId: crypto.randomUUID(),
        actorRole: "secretariat",
        at: "2026-09-01T00:00:00.000Z",
        summary: "orphan published row",
        version: 1,
        publicRecordId: "BBNJ-MGR-2026-00999",
      }),
    );
    const res = dispatch(h.db, orphan.id);
    expect(res.error).toMatch(/record not found/);
    const log = h.db.prepare("SELECT error FROM dispatch_log WHERE event_id = ?").get(orphan.id) as { error: string };
    expect(log.error).toMatch(/record not found/);
  });
});
