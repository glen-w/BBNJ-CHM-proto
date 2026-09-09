import { afterEach, describe, expect, it } from "vitest";

import {
  addEiaPack,
  commentStb,
  createEiaActivity,
  getEiaActivity,
  isPublishableStage,
  packsForActivity,
  setEiaDueAt,
  stbQueue,
} from "@/server/eia";
import { publishPack } from "@/server/packs";
import { createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("isPublishableStage", () => {
  it("excludes scoping_notice and comments_stb", () => {
    expect(isPublishableStage("screening")).toBe(true);
    expect(isPublishableStage("draft_eia")).toBe(true);
    expect(isPublishableStage("scoping_notice")).toBe(false);
    expect(isPublishableStage("comments_stb")).toBe(false);
  });
});

describe("EIA journey I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("creates an activity with a draft screening pack and replays the key", () => {
    h = createHarness();
    expectDomainCode(() => createEiaActivity(h.db, h.party(), { title: "  ", abnjBox: "CCZ" }, h.key()), "validation");
    expectDomainCode(
      () => createEiaActivity(h.db, h.party(), { title: "Survey", abnjBox: "not-a-box" }, h.key()),
      "validation",
    );
    const k = h.key();
    const a = createEiaActivity(h.db, h.party(), { title: "Acoustic survey", abnjBox: "Reykjanes Ridge" }, k);
    expect(a.created).toBe(true);
    expect(a.activity.currentStage).toBe("screening");
    expect(a.event.status).toBe("draft");
    expect(a.activity.sourceChannel).toBe("form");
    const b = createEiaActivity(h.db, h.party(), { title: "Acoustic survey", abnjBox: "Reykjanes Ridge" }, k);
    expect(b.activity.id).toBe(a.activity.id);
    expect(getEiaActivity(h.db, a.activity.id)?.title).toBe("Acoustic survey");
  });

  it("requires a screening outcome and refuses non-publishable stages", () => {
    h = createHarness();
    const act = createEiaActivity(h.db, h.party(), { title: "Sediment", abnjBox: "CCZ" }, h.key());
    expectDomainCode(
      () => addEiaPack(h.db, h.party(), act.activity.id, "screening", "missing outcome", h.key()),
      "validation",
    );
    expectDomainCode(
      () => addEiaPack(h.db, h.party(), act.activity.id, "scoping_notice", "not a pack", h.key()),
      "validation",
    );
    const screening = addEiaPack(h.db, h.party(), act.activity.id, "screening", "EIA required", h.key(), {
      screeningOutcome: "eia_required",
    });
    expect(screening.event.screeningOutcome).toBe("eia_required");
    expect(screening.event.status).toBe("pending");
  });

  it("feeds the STB queue from a published draft_eia and allows one comment per version", () => {
    h = createHarness();
    const act = createEiaActivity(h.db, h.party(), { title: "CCZ sediment", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), act.activity.id, "screening", "EIA required", h.key(), { screeningOutcome: "eia_required" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "screening" });
    addEiaPack(h.db, h.party(), act.activity.id, "draft_eia", "Draft for consultation", h.key());
    expect(stbQueue(h.db, h.stb())).toEqual([]);
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "draft_eia" });

    const queue = stbQueue(h.db, h.stb());
    expect(queue.some((q) => q.activityId === act.activity.id)).toBe(true);

    expectDomainCode(() => commentStb(h.db, h.party(), act.activity.id, "nope", h.key()), "forbidden");
    expectDomainCode(() => commentStb(h.db, h.stb(), act.activity.id, "   ", h.key()), "validation");
    const k = h.key();
    const c = commentStb(h.db, h.stb(), act.activity.id, "Consolidated STB view", k);
    expect(c.event.stage).toBe("comments_stb");
    expect(c.event.status).toBe("published");
    expect(c.event.version).toBe(1);
    expect(commentStb(h.db, h.stb(), act.activity.id, "replay", k).event.id).toBe(c.event.id);
    expect(stbQueue(h.db, h.stb()).some((q) => q.activityId === act.activity.id)).toBe(false);
    expectDomainCode(() => commentStb(h.db, h.stb(), act.activity.id, "second", h.key()), "already_commented");
  });

  it("hides draft packs from the public reader (Lock 2 coexistence)", () => {
    h = createHarness();
    const act = createEiaActivity(h.db, h.party(), { title: "Baseline", abnjBox: "CCZ" }, h.key());
    addEiaPack(h.db, h.party(), act.activity.id, "screening", "EIA required", h.key(), { screeningOutcome: "eia_required" });
    publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "screening" });
    addEiaPack(h.db, h.party(), act.activity.id, "draft_eia", "WIP", h.key(), { status: "draft" });

    const sec = packsForActivity(h.db, h.secretariat(), act.activity.id);
    expect(sec.some((p) => p.stage === "draft_eia" && p.status === "draft")).toBe(true);
    const pub = packsForActivity(h.db, h.pub(), act.activity.id);
    expect(pub.every((p) => p.status === "published")).toBe(true);
    expectDomainCode(
      () => publishPack(h.db, h.secretariat(), { domain: "eia", recordId: act.activity.id, stage: "draft_eia" }),
      "not_pending",
    );
  });

  it("marks Secretariat-created activities as assisted", () => {
    h = createHarness();
    const act = createEiaActivity(
      h.db,
      h.secretariat(),
      { title: "On behalf", abnjBox: "CCZ", partyCode: "XSD" },
      h.key(),
    );
    expect(act.activity.sourceChannel).toBe("assisted");
    expect(act.activity.partyCode).toBe("XSD");
  });

  it("stores pack artifactRefs and an explicit dueAt", () => {
    h = createHarness();
    const act = createEiaActivity(h.db, h.party(), { title: "Artefact survey", abnjBox: "CCZ" }, h.key());
    const refs = [
      { kind: "pdf" as const, label: "Screening extract", href: "http://127.0.0.1:3000/demo-artifacts/eia-screening-demo.pdf" },
      { kind: "note" as const, label: "Metadata only" },
    ];
    const pack = addEiaPack(h.db, h.party(), act.activity.id, "screening", "required", h.key(), {
      screeningOutcome: "eia_required",
      artifactRefs: refs,
    });
    expect(pack.event.artifactRefs).toEqual(refs);
    const updated = setEiaDueAt(h.db, h.party(), act.activity.id, "2026-10-15T12:00:00.000Z");
    expect(updated.dueAt).toBe("2026-10-15T12:00:00.000Z");
    expectDomainCode(() => setEiaDueAt(h.db, h.party(), act.activity.id, "not-a-date"), "validation");
    expectDomainCode(() => setEiaDueAt(h.db, h.nonstate(), act.activity.id, "2026-10-16T12:00:00.000Z"), "forbidden");
  });
});
