import { afterEach, describe, expect, it } from "vitest";

import {
  MGR_AMENDABLE_STAGES,
  addMgrPack,
  amendMgrPack,
  getMgrBatch,
  receivePreCollection,
  saveMgrDraft,
  submitPreCollection,
} from "@/server/mgr";
import { publishPack } from "@/server/packs";
import { VALID_MGR, createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("MGR journey I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("saves a draft without minting, then submit mints B-SBI + receipt on the same batch", () => {
    h = createHarness();
    const kDraft = h.key();
    const draft = saveMgrDraft(h.db, h.party(), { title: "Draft cruise", locationHint: "Reykjanes Ridge" }, kDraft);
    expect(draft.created).toBe(true);
    expect(draft.batch.bSbi).toBeUndefined();
    expect(draft.batch.currentStage).toBe("pre_collection");
    expect(draft.batch.sourceChannel).toBe("form");
    expect(draft.event.status).toBe("draft");

    const edited = saveMgrDraft(h.db, h.party(), { title: "Draft cruise (edited)" }, kDraft, { batchId: draft.batch.id });
    expect(edited.created).toBe(false);
    expect(edited.batch.id).toBe(draft.batch.id);
    expect(edited.batch.title).toBe("Draft cruise (edited)");
    expect(getMgrBatch(h.db, draft.batch.id)?.bSbi).toBeUndefined();

    const submitted = submitPreCollection(h.db, h.party(), draft.batch.id, {}, h.key());
    expect(submitted.batch.id).toBe(draft.batch.id);
    expect(submitted.batch.bSbi).toMatch(/^BSBI-XSD-\d{4}-/);
    expect(submitted.batch.currentStage).toBe("batch_id_issued");
    expect(submitted.event.receiptId).toMatch(/^BBNJ-RCPT-/);
    expect(submitted.event.status).toBe("pending");
  });

  it("replays save/submit on the same idempotency key without a second batch", () => {
    h = createHarness();
    const k = h.key();
    const a = saveMgrDraft(h.db, h.party(), VALID_MGR, k);
    const b = saveMgrDraft(h.db, h.party(), VALID_MGR, k);
    expect(b.batch.id).toBe(a.batch.id);
    expect(b.created).toBe(false);

    const k2 = h.key();
    const s1 = submitPreCollection(h.db, h.party(), a.batch.id, {}, k2);
    const s2 = submitPreCollection(h.db, h.party(), a.batch.id, {}, k2);
    expect(s2.event.id).toBe(s1.event.id);
    expectDomainCode(() => submitPreCollection(h.db, h.party(), a.batch.id, {}, h.key()), "already_submitted");
  });

  it("receivePreCollection validates, mints once, and marks Secretariat form submits as assisted", () => {
    h = createHarness();
    expectDomainCode(() => receivePreCollection(h.db, h.party(), { title: "" }, "form", h.key()), "validation");
    expectDomainCode(() => receivePreCollection(h.db, h.anon(), VALID_MGR, "form", h.key()), "forbidden");
    expectDomainCode(() => receivePreCollection(h.db, h.secretariat(), VALID_MGR, "form", h.key()), "validation");

    const other = receivePreCollection(h.db, h.otherParty(), VALID_MGR, "form", h.key());
    expect(other.batch.partyCode).toBe("ZZZ");

    const assisted = receivePreCollection(h.db, h.secretariat(), VALID_MGR, "form", h.key(), { partyCode: "XSD" });
    expect(assisted.batch.sourceChannel).toBe("assisted");
    expect(assisted.batch.partyCode).toBe("XSD");

    const excel = receivePreCollection(h.db, h.secretariat(), VALID_MGR, "excel", h.key(), { partyCode: "xsd" });
    expect(excel.batch.sourceChannel).toBe("excel");

    const k = h.key();
    const r1 = receivePreCollection(h.db, h.party(), VALID_MGR, "form", k);
    const r2 = receivePreCollection(h.db, h.party(), VALID_MGR, "form", k);
    expect(r2.batch.id).toBe(r1.batch.id);
  });

  it("refuses later packs until receipt, then ignores a client-supplied version", () => {
    h = createHarness();
    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    expectDomainCode(
      () => addMgrPack(h.db, h.party(), draft.batch.id, "post_collection", "too soon", h.key()),
      "invalid_transition",
    );
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    const pack = addMgrPack(h.db, h.party(), rec.batch.id, "utilisation", "Use of samples", h.key(), { version: 99 });
    expect(pack.event.version).toBe(1);
    expect(pack.event.stage).toBe("utilisation");
    expect(pack.event.bSbi).toBe(rec.batch.bSbi);
    expectDomainCode(() => addMgrPack(h.db, h.party(), crypto.randomUUID(), "post_collection", "x", h.key()), "not_found");
  });

  it("blocks another Party from editing a draft they do not own", () => {
    h = createHarness();
    const draft = saveMgrDraft(h.db, h.party(), VALID_MGR, h.key());
    expectDomainCode(
      () => saveMgrDraft(h.db, h.otherParty(), { title: "hijack" }, h.key(), { batchId: draft.batch.id }),
      "forbidden",
    );
  });

  it("amends pre_collection pack with fieldEdits and records superseded history", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), { ...VALID_MGR, title: "Original Cruise", objectives: "Original Obj" }, "form", h.key());
    publishPack(h.db, h.secretariat(), { domain: "mgr", recordId: rec.batch.id, stage: "pre_collection" });

    const k = h.key();
    const amended = amendMgrPack(
      h.db,
      h.party(),
      rec.batch.id,
      "pre_collection",
      {
        changeNote: "Updated objectives",
        materialChange: false,
        fieldEdits: { title: "Amended Cruise", locationHint: "CCZ", objectives: "Amended Obj" },
      },
      k,
    );

    expect(amended.created).toBe(true);
    expect(amended.event.version).toBe(2);
    expect(amended.event.status).toBe("pending");
    expect(amended.batch.title).toBe("Amended Cruise");
    expect(amended.batch.details.objectives).toBe("Amended Obj");
    expect(amended.batch.bSbi).toBe(rec.batch.bSbi);
    expect(amended.batch.detailsHistory.length).toBe(1);
    expect(amended.batch.detailsHistory[0].version).toBe(1);

    // Replay on same key returns existing
    const replay = amendMgrPack(
      h.db,
      h.party(),
      rec.batch.id,
      "pre_collection",
      { changeNote: "replay", materialChange: false },
      k,
    );
    expect(replay.created).toBe(false);
    expect(replay.event.id).toBe(amended.event.id);
  });

  it("refuses amendment of non-published or unsupported stages", () => {
    h = createHarness();
    const rec = receivePreCollection(h.db, h.party(), VALID_MGR, "form", h.key());
    // Pending (not yet published)
    expectDomainCode(
      () => amendMgrPack(h.db, h.party(), rec.batch.id, "pre_collection", { changeNote: "note", materialChange: false }, h.key()),
      "invalid_transition",
    );
    expect(MGR_AMENDABLE_STAGES).toEqual(["pre_collection", "post_collection", "utilisation"]);
  });
});
