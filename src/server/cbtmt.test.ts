import { afterEach, describe, expect, it } from "vitest";

import {
  createCbtmtRecord,
  getCbtmtRecord,
  matchesForRecord,
  normaliseThemes,
  suggestMatch,
  suggestMatches,
} from "@/server/cbtmt";
import { publishPack } from "@/server/packs";
import { createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("normaliseThemes", () => {
  it("splits, trims, lowercases, dedupes", () => {
    expect(normaliseThemes(" Taxonomy, genomics, taxonomy ")).toEqual(["taxonomy", "genomics"]);
    expect(normaliseThemes(["EIA practice", "eia_practice"])).toEqual(["eia_practice"]);
    expect(normaliseThemes(undefined)).toEqual([]);
  });
});

describe("CBTMT journey I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  function publishedPair() {
    const need = createCbtmtRecord(
      h.db,
      h.party(),
      { kind: "need", title: "Taxonomy training", themes: "taxonomy, genomics" },
      h.key(),
    );
    const offer = createCbtmtRecord(
      h.db,
      h.secretariat(),
      { kind: "offer", title: "Lab placements", themes: ["taxonomy"], provider: "Demo Ocean Tech" },
      h.key(),
    );
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: need.record.id, stage: "need_posted" });
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: offer.record.id, stage: "offer_posted" });
    return { need, offer };
  }

  it("creates a pending need/offer and replays the idempotency key", () => {
    h = createHarness();
    expectDomainCode(
      () => createCbtmtRecord(h.db, h.party(), { kind: "need", title: "x", themes: [] }, h.key()),
      "validation",
    );
    expectDomainCode(
      () => createCbtmtRecord(h.db, h.party(), { kind: "offer", title: "x", themes: ["taxonomy"] }, h.key()),
      "validation",
    );
    const k = h.key();
    const need = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Training", themes: "taxonomy" }, k);
    expect(need.record.kind).toBe("need");
    if (need.record.kind !== "need") throw new Error("expected need");
    expect(need.record.partyCode).toBe("XSD");
    expect(need.event.status).toBe("pending");
    expect(createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Training", themes: "taxonomy" }, k).record.id).toBe(
      need.record.id,
    );
    expect(getCbtmtRecord(h.db, need.record.id)?.themes).toEqual(["taxonomy"]);
  });

  it("refuses matching until both sides are published, then insert-or-ignores duplicates", () => {
    h = createHarness();
    const need = createCbtmtRecord(h.db, h.party(), { kind: "need", title: "Need", themes: "taxonomy" }, h.key());
    const offer = createCbtmtRecord(
      h.db,
      h.secretariat(),
      { kind: "offer", title: "Offer", themes: ["taxonomy"], provider: "Lab" },
      h.key(),
    );
    expectDomainCode(
      () => suggestMatch(h.db, h.secretariat(), need.record.id, offer.record.id, "shared_theme:taxonomy", h.key()),
      "invalid_transition",
    );
    expectDomainCode(() => suggestMatch(h.db, h.party(), need.record.id, offer.record.id, "x", h.key()), "forbidden");

    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: need.record.id, stage: "need_posted" });
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: offer.record.id, stage: "offer_posted" });
    const created = suggestMatch(h.db, h.secretariat(), need.record.id, offer.record.id, "shared_theme:taxonomy", h.key());
    expect(created.created).toBe(true);
    expect(created.event?.matchId).toBe(created.match.id);
    expect(created.event?.relatedRecordId).toBe(offer.record.id);

    const dup = suggestMatch(h.db, h.secretariat(), need.record.id, offer.record.id, "shared_theme:taxonomy", h.key());
    expect(dup.created).toBe(false);
    expect(dup.event).toBeUndefined();
    expect(matchesForRecord(h.db, need.record.id)).toHaveLength(1);
  });

  it("suggestMatches pairs published records that share a theme", () => {
    h = createHarness();
    const { need, offer } = publishedPair();
    const unrelated = createCbtmtRecord(
      h.db,
      h.secretariat(),
      { kind: "offer", title: "Unrelated", themes: ["eia_practice"], provider: "Other" },
      h.key(),
    );
    publishPack(h.db, h.secretariat(), { domain: "cbtmt", recordId: unrelated.record.id, stage: "offer_posted" });
    const results = suggestMatches(h.db, h.secretariat(), h.key());
    const hit = results.find((r) => r.match.needId === need.record.id && r.match.offerId === offer.record.id);
    expect(hit?.created).toBe(true);
    expect(hit?.match.rule).toBe("shared_theme:taxonomy");
    expect(results.some((r) => r.match.offerId === unrelated.record.id)).toBe(false);
  });

  it("enforces the foreign key on cbtmt_matches", () => {
    h = createHarness();
    const { need } = publishedPair();
    expect(() =>
      h.db
        .prepare("INSERT INTO cbtmt_matches(id, need_id, offer_id, rule, at) VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), need.record.id, crypto.randomUUID(), "x", new Date().toISOString()),
    ).toThrow();
  });
});
