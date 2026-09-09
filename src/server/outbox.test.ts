import { afterEach, describe, expect, it } from "vitest";

import { Event } from "@/lib/contracts/events";
import {
  domainOfRecord,
  eventsOfRecord,
  findEventByKey,
  firstPublicRecordId,
  getEvent,
  insertEvent,
  latestEventOfRecord,
  latestPackRow,
  packRow,
  packsOfRecord,
  versionsOfPack,
} from "@/server/outbox";
import { deriveCaches, getRecordMeta, recordTable, refreshCaches } from "@/server/records";
import { receivePreCollection } from "@/server/mgr";
import { publishPack } from "@/server/packs";
import { VALID_MGR, createHarness, type Harness } from "@/test/helpers";

const recordId = "00000000-0000-4000-8000-0000000000aa";

function draftEvent(over: Record<string, unknown> = {}) {
  return Event.parse({
    id: crypto.randomUUID(),
    domain: "mgr",
    stage: "pre_collection",
    status: "draft",
    recordId,
    actorRole: "party",
    at: "2026-09-01T00:00:00.000Z",
    summary: "draft row",
    version: 1,
    ...over,
  });
}

describe("recordTable", () => {
  it("maps all four domains, ABMT included (v5 thin stub)", () => {
    expect(recordTable("mgr")).toBe("mgr_batches");
    expect(recordTable("eia")).toBe("eia_activities");
    expect(recordTable("cbtmt")).toBe("cbtmt_records");
    expect(recordTable("abmt")).toBe("abmt_proposals");
    const h = createHarness();
    try {
      expect(getRecordMeta(h.db, "abmt", "00000000-0000-4000-8000-0000000000ff")).toBeUndefined();
    } finally {
      h.cleanup();
    }
  });
});

describe("outbox I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("inserts, looks up by id/key, and never updates rows", () => {
    h = createHarness();
    const stored = insertEvent(h.db, draftEvent(), "idem-key-1", { changeNote: "n/a", materialChange: false });
    expect(stored.seq).toBe(1);
    expect(stored.idempotencyKey).toBe("idem-key-1");
    expect(getEvent(h.db, stored.id)?.summary).toBe("draft row");
    expect(findEventByKey(h.db, "idem-key-1")?.id).toBe(stored.id);
    expect(findEventByKey(h.db, "missing")).toBeUndefined();
    expect(latestPackRow(h.db, recordId, "pre_collection")?.id).toBe(stored.id);
    expect(packRow(h.db, recordId, "pre_collection", 1)?.id).toBe(stored.id);
    expect(domainOfRecord(h.db, recordId)).toBe("mgr");
  });

  it("enforces unique (record, stage, version, status)", () => {
    h = createHarness();
    insertEvent(h.db, draftEvent({ id: crypto.randomUUID() }));
    expect(() => insertEvent(h.db, draftEvent({ id: crypto.randomUUID() }))).toThrow();
  });

  it("returns the latest row per version as the pack chain", () => {
    h = createHarness();
    const pendingId = crypto.randomUUID();
    insertEvent(h.db, draftEvent());
    insertEvent(
      h.db,
      Event.parse({
        id: pendingId,
        domain: "mgr",
        stage: "pre_collection",
        status: "pending",
        recordId,
        actorRole: "party",
        at: "2026-09-01T01:00:00.000Z",
        summary: "pending",
        version: 1,
        receiptId: "BBNJ-RCPT-2026-00001",
      }),
    );
    const latest = latestPackRow(h.db, recordId, "pre_collection");
    expect(latest?.status).toBe("pending");
    expect(latest?.id).toBe(pendingId);
    expect(versionsOfPack(h.db, recordId, "pre_collection")).toHaveLength(1);
    expect(packsOfRecord(h.db, recordId)).toHaveLength(1);
    expect(eventsOfRecord(h.db, recordId)).toHaveLength(2);
    expect(latestEventOfRecord(h.db, recordId)?.id).toBe(pendingId);
    expect(firstPublicRecordId(h.db, recordId)).toBeUndefined();
  });
});

describe("deriveCaches / refreshCaches", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("derives MGR stage from B-SBI even when the event stage is still pre_collection", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    const derived = deriveCaches(h.db, "mgr", rec.batch.id);
    expect(derived.currentStage).toBe("batch_id_issued");
    expect(derived.bSbi).toMatch(/^BSBI-/);
    expect(derived.publicRecordId).toBeNull();
    const meta = getRecordMeta(h.db, "mgr", rec.batch.id);
    expect(meta?.title).toBe("Test cruise ALPHA");
    expect(meta?.ownerUserId).toBeDefined();

    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    const after = refreshCaches(h.db, "mgr", rec.batch.id);
    expect(after.publicRecordId).toMatch(/^BBNJ-MGR-/);
    expect(firstPublicRecordId(h.db, rec.batch.id)).toBe(after.publicRecordId);
  });
});
