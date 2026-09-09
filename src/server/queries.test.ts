import { afterEach, describe, expect, it } from "vitest";

import { createCbtmtRecord, getCbtmtRecord } from "@/server/cbtmt";
import { addEiaPack, createEiaActivity, getEiaActivity } from "@/server/eia";
import { getMgrBatch, receivePreCollection, saveMgrDraft } from "@/server/mgr";
import { publishPack } from "@/server/packs";
import {
  auditRows,
  getSubscription,
  latestVisibleEvent,
  listCbtmtRecords,
  listEiaActivities,
  listMgrBatches,
  markAllRead,
  notificationsFor,
  packsOf,
  railCounts,
  recentPublished,
  recordVisible,
  resolvePublicRecord,
  searchRecords,
  timelineOf,
  toFtsQuery,
  unreadCount,
  upsertSubscription,
} from "@/server/queries";
import { reconcile } from "@/server/reconcile";
import { SEED_USERS } from "@/server/seed";
import { VALID_MGR, createHarness, type Harness } from "@/test/helpers";

describe("policy-filtered queries", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("hides drafts and restricted/confidential rows from the public reader", () => {
    h = createHarness();
    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    const pub = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: pub.batch.id, stage: "pre_collection" });
    const restricted = receivePreCollection(
      h.db,
      h.party(),
      { ...VALID_MGR, title: "Restricted cruise", confidentiality: "restricted" },
      "form",
      h.key(),
    );
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: restricted.batch.id, stage: "pre_collection" });
    const confidential = receivePreCollection(
      h.db,
      h.party(),
      { ...VALID_MGR, title: "Confidential cruise", confidentiality: "confidential" },
      "form",
      h.key(),
    );
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: confidential.batch.id, stage: "pre_collection" });

    const publicList = listMgrBatches(h.db, h.pub());
    expect(publicList.some((b) => b.id === draft.batch.id)).toBe(false);
    expect(publicList.some((b) => b.id === pub.batch.id)).toBe(true);
    expect(publicList.some((b) => b.id === restricted.batch.id)).toBe(false);
    expect(publicList.some((b) => b.id === confidential.batch.id)).toBe(false);

    expect(listMgrBatches(h.db, h.stb()).some((b) => b.id === restricted.batch.id)).toBe(true);
    expect(listMgrBatches(h.db, h.stb()).some((b) => b.id === confidential.batch.id)).toBe(false);
    expect(listMgrBatches(h.db, h.party()).some((b) => b.id === confidential.batch.id)).toBe(true);
    expect(listMgrBatches(h.db, h.party()).some((b) => b.id === draft.batch.id)).toBe(true);

    expect(recordVisible(h.db, h.pub(), "mgr", restricted.batch.id)).toBe(false);
    const published = getMgrBatch(h.db, pub.batch.id)!;
    const restrictedRow = getMgrBatch(h.db, restricted.batch.id)!;
    expect(resolvePublicRecord(h.db, h.pub(), restrictedRow.publicRecordId!)).toBeUndefined();
    expect(resolvePublicRecord(h.db, h.secretariat(), published.publicRecordId!)?.recordId).toBe(pub.batch.id);

    const publicAudit = auditRows(h.db, h.pub(), {});
    expect(publicAudit.every((r) => r.status === "published" && r.confidentiality === "public")).toBe(true);
    expect(publicAudit.every((r) => r.actorUserId === undefined)).toBe(true);
    const secAudit = auditRows(h.db, h.secretariat(), { domain: "mgr" });
    expect(secAudit.some((r) => r.actorUserId)).toBe(true);
    expect(recentPublished(h.db, h.pub()).some((r) => r.recordId === restricted.batch.id)).toBe(false);
    const feed = recentPublished(h.db, h.secretariat());
    expect(feed[0]?.status).toBe("published");
    expect(feed.some((r) => r.confidentiality === "restricted" && r.recordId === restricted.batch.id)).toBe(true);

    const counts = railCounts(h.db, h.pub());
    expect(counts.audit).toBe(publicAudit.length);
    expect(packsOf(h.db, h.pub(), draft.batch.id)).toEqual([]);
    expect(timelineOf(h.db, h.party(), draft.batch.id).length).toBeGreaterThan(0);
  });

  it("applies FTS text filter and kind filter", () => {
    h = createHarness();
    receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Alpha Ridge cruise", locationHint: "Reykjanes" }, "form", h.key());
    receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Sponge survey", locationHint: "ClarionClipperton" }, "form", h.key());
    expect(listMgrBatches(h.db, h.secretariat(), "Alpha")).toHaveLength(1);
    expect(listMgrBatches(h.db, h.secretariat(), "ClarionClipperton")).toHaveLength(1);
    createEiaActivity(h.db, h.party(), { title: "Acoustic", abnjBox: "Reykjanes Ridge" }, h.key());
    expect(listEiaActivities(h.db, h.secretariat(), "Acoustic")).toHaveLength(1);
    createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Need", themes: "taxonomy" }, h.key());
    createCbtmtRecord(h.db, h.secretariat(), { kind: "offer", title: "Offer", themes: "taxonomy", provider: "Lab" }, h.key());
    expect(listCbtmtRecords(h.db, h.secretariat(), "need")).toHaveLength(1);
    expect(listCbtmtRecords(h.db, h.secretariat(), "offer")).toHaveLength(1);
    expect(listCbtmtRecords(h.db, h.secretariat(), undefined, "taxonomy").length).toBeGreaterThanOrEqual(1);
  });

  it("searchRecords respects FTS matches and role visibility", () => {
    h = createHarness();
    const pub = receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Public hydrothermal vents" }, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: pub.batch.id, stage: "pre_collection" });
    const draft = saveMgrDraft(h.db, h.party(), { ...VALID_MGR, title: "Secret hydrothermal vents" }, h.key());
    const restricted = receivePreCollection(
      h.db,
      h.party(),
      { ...VALID_MGR, title: "Restricted hydrothermal vents", confidentiality: "restricted" },
      "form",
      h.key(),
    );
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: restricted.batch.id, stage: "pre_collection" });

    const publicHits = searchRecords(h.db, h.pub(), { q: "hydrothermal" });
    expect(publicHits.some((h) => h.id === pub.batch.id)).toBe(true);
    expect(publicHits.some((h) => h.id === draft.batch.id)).toBe(false);
    expect(publicHits.some((h) => h.id === restricted.batch.id)).toBe(false);

    const partyHits = searchRecords(h.db, h.party(), { q: "hydrothermal" });
    expect(partyHits.some((h) => h.id === draft.batch.id)).toBe(true);
    expect(partyHits.some((h) => h.id === restricted.batch.id)).toBe(true);

    expect(toFtsQuery('  alpha "ridge" (x) ')).toBe('"alpha"* AND "ridge"* AND "x"*');
    expect(toFtsQuery("   ")).toBeNull();
  });

  it("resolves publicRecordId for EIA and CBTMT domains", () => {
    h = createHarness();
    const e = createEiaActivity(h.db, h.party(), { title: "EIA Resolver Test", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), e.activity.id, "screening", "Screening outcome", h.key(), { screeningOutcome: "no_eia" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });
    const eRow = getEiaActivity(h.db, e.activity.id)!;
    expect(resolvePublicRecord(h.db, h.pub(), eRow.publicRecordId!)?.domain).toBe("eia");

    const c = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "CBTMT Resolver Test", themes: "taxonomy" }, h.key());
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: c.record.id, stage: "need_posted" });
    const cRow = getCbtmtRecord(h.db, c.record.id)!;
    expect(resolvePublicRecord(h.db, h.pub(), cRow.publicRecordId!)?.domain).toBe("cbtmt");

    expect(resolvePublicRecord(h.db, h.pub(), "BBNJ-MGR-2026-99999")).toBeUndefined();
  });

  it("supports auditRows filters by domain and status, with limit", () => {
    h = createHarness();
    const m = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: m.batch.id, stage: "pre_collection" });

    const e = createEiaActivity(h.db, h.party(), { title: "EIA Audit Test", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), e.activity.id, "screening", "Screening outcome", h.key(), { screeningOutcome: "no_eia" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });

    const mgrOnly = auditRows(h.db, h.secretariat(), { domain: "mgr" });
    expect(mgrOnly.every((r) => r.domain === "mgr")).toBe(true);

    const pubOnly = auditRows(h.db, h.secretariat(), { status: "published" });
    expect(pubOnly.every((r) => r.status === "published")).toBe(true);

    const limited = auditRows(h.db, h.secretariat(), { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("reads and writes subscriptions and notification read-state for the session user", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    expect(unreadCount(h.db, h.anon())).toBe(0);
    expect(notificationsFor(h.db, h.anon())).toEqual([]);
    expect(unreadCount(h.db, h.party())).toBeGreaterThan(0);
    markAllRead(h.db, h.party());
    expect(unreadCount(h.db, h.party())).toBe(0);

    upsertSubscription(h.db, {
      id: "00000000-0000-4000-8000-00000000a020",
      userId: SEED_USERS[0].id,
      themes: ["taxonomy"],
      abnjBoxes: ["CCZ"],
      domains: ["mgr"],
      digest: "weekly",
    });
    const sub = getSubscription(h.db, h.party());
    expect(sub?.digest).toBe("weekly");
    expect(sub?.themes).toEqual(["taxonomy"]);
    expect(getSubscription(h.db, h.anon())).toBeUndefined();
  });

  it("reconcile() reports no mismatches after a full MGR publish", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });
    const r = reconcile(h.db);
    expect(r.mismatches).toEqual([]);
    expect(r.checked).toBeGreaterThan(0);
  });

  it("latestVisibleEvent follows outbox seq and role visibility (ribbon)", () => {
    h = createHarness();
    expect(latestVisibleEvent(h.db, h.pub())).toBeNull();

    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    const partyLatest = latestVisibleEvent(h.db, h.party());
    expect(partyLatest?.status).toBe("draft");
    expect(partyLatest?.recordId).toBe(draft.batch.id);
    expect(latestVisibleEvent(h.db, h.pub())).toBeNull();

    const pending = receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Ribbon cruise" }, "form", h.key());
    expect(pending.batch.bSbi).toMatch(/^BSBI-/);
    expect(pending.batch.publicRecordId).toBeUndefined();
    const afterReceipt = latestVisibleEvent(h.db, h.secretariat());
    expect(afterReceipt?.status).toBe("pending");
    expect(afterReceipt?.bSbi).toBe(pending.batch.bSbi);
    expect(afterReceipt?.publicRecordId).toBeUndefined();
    expect(afterReceipt?.bSbi).not.toBe(afterReceipt?.publicRecordId);

    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: pending.batch.id, stage: "pre_collection" });
    const published = getMgrBatch(h.db, pending.batch.id)!;
    const pubLatest = latestVisibleEvent(h.db, h.pub());
    expect(pubLatest?.status).toBe("published");
    expect(pubLatest?.publicRecordId).toBe(published.publicRecordId);
    expect(pubLatest?.bSbi).toBe(published.bSbi);
    expect(pubLatest?.publicRecordId).not.toBe(pubLatest?.bSbi);
    expect(pubLatest?.publicRecordId).toMatch(/^BBNJ-MGR-/);
    expect(pubLatest?.bSbi).toMatch(/^BSBI-/);
  });
});
