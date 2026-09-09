import { afterEach, describe, expect, it } from "vitest";

import { addMgrPack, receivePreCollection, saveMgrDraft } from "@/server/mgr";
import { amendPack, openPack, packVersions, publishPack } from "@/server/packs";
import { VALID_MGR, createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("openPack / publishPack / amendPack", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("allocates versions server-side: draft→pending same version, published→+1", () => {
    h = createHarness();
    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    const pending = openPack(h.db, h.party(), {
      domain: "mgr",
      recordId: draft.batch.id,
      stage: "pre_collection",
      status: "pending",
      summary: "submit",
      idempotencyKey: h.key(),
    });
    expect(pending.event.version).toBe(1);
    expect(pending.event.receiptId).toMatch(/^BBNJ-RCPT-/);

    expectDomainCode(
      () =>
        openPack(h.db, h.party(), {
          domain: "mgr",
          recordId: draft.batch.id,
          stage: "pre_collection",
          status: "pending",
          summary: "again",
          idempotencyKey: h.key(),
        }),
      "already_submitted",
    );
  });

  it("is a no-op on a repeated idempotency key", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    const k = h.key();
    const a = openPack(h.db, h.party(), {
      domain: "mgr",
      recordId: rec.batch.id,
      stage: "post_collection",
      status: "pending",
      summary: "post",
      idempotencyKey: k,
      extras: { bSbi: rec.batch.bSbi },
    });
    const b = openPack(h.db, h.party(), {
      domain: "mgr",
      recordId: rec.batch.id,
      stage: "post_collection",
      status: "pending",
      summary: "post",
      idempotencyKey: k,
    });
    expect(b.created).toBe(false);
    expect(b.event.id).toBe(a.event.id);
  });

  it("publishes once, mints publicRecordId, then no-ops; stale expectedVersion is refused", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    expectDomainCode(
      () => publishPack(h.db, h.party(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" }),
      "forbidden",
    );
    const first = publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    expect(first.created).toBe(true);
    expect(first.event.status).toBe("published");
    expect(first.event.publicRecordId).toMatch(/^BBNJ-MGR-/);
    const second = publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    expect(second.created).toBe(false);
    expect(second.event.id).toBe(first.event.id);

    addMgrPack(h.db, h.party(), rec.batch.id, "post_collection", "post v1", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "post_collection" });
    addMgrPack(h.db, h.party(), rec.batch.id, "post_collection", "post v2", h.key());
    expectDomainCode(
      () =>
        publishPack(h.db, h.secretariat(), {
          domain: "mgr",
          recordId: rec.batch.id,
          stage: "post_collection",
          expectedVersion: 1,
        }),
      "stale_pack",
    );
  });

  it("amends a published pack into pending v+1 with a change note", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    expectDomainCode(
      () =>
        amendPack(h.db, h.party(), {
          domain: "mgr",
          recordId: rec.batch.id,
          stage: "pre_collection",
          summary: "",
          changeNote: "   ",
          materialChange: false,
          idempotencyKey: h.key(),
        }),
      "validation",
    );
    const amended = amendPack(h.db, h.party(), {
      domain: "mgr",
      recordId: rec.batch.id,
      stage: "pre_collection",
      summary: "Corrected coordinates",
      changeNote: "Typo in area",
      materialChange: true,
      idempotencyKey: h.key(),
    });
    expect(amended.created).toBe(true);
    expect(amended.event.version).toBe(2);
    expect(amended.event.status).toBe("pending");
    expect(amended.event.changeNote).toBe("Typo in area");
    expect(amended.event.materialChange).toBe(true);
    expect(amended.event.bSbi).toBe(rec.batch.bSbi);
    expect(packVersions(h.db, rec.batch.id, "pre_collection").map((e) => e.version)).toEqual([1, 2]);

    expectDomainCode(
      () =>
        amendPack(h.db, h.party(), {
          domain: "mgr",
          recordId: rec.batch.id,
          stage: "pre_collection",
          summary: "again",
          changeNote: "nope",
          materialChange: false,
          idempotencyKey: h.key(),
        }),
      "invalid_transition",
    );
  });

  it("refuses unknown records and draft-on-draft", () => {
    h = createHarness();
    expectDomainCode(
      () =>
        openPack(h.db, h.party(), {
          domain: "mgr",
          recordId: crypto.randomUUID(),
          stage: "pre_collection",
          status: "draft",
          summary: "ghost",
          idempotencyKey: h.key(),
        }),
      "not_found",
    );
    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    expectDomainCode(
      () =>
        openPack(h.db, h.party(), {
          domain: "mgr",
          recordId: draft.batch.id,
          stage: "pre_collection",
          status: "draft",
          summary: "second draft",
          idempotencyKey: h.key(),
        }),
      "invalid_transition",
    );
    expectDomainCode(
      () => publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: draft.batch.id, stage: "pre_collection" }),
      "not_pending",
    );
  });
});
