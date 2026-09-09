import { describe, expect, it } from "vitest";

import {
  AbmtEvent,
  AbnjBox,
  ActorRole,
  ArtifactRef,
  CbtmtMatch,
  CbtmtNeed,
  CbtmtOffer,
  ConfidentialityTier,
  Domain,
  EiaActivity,
  Event,
  Notification,
  PublicRecordId,
  PublishStatus,
  SourceChannel,
  Subscription,
  User,
} from "@/lib/contracts/events";
import {
  BSBI_PATTERN,
  BSbiStrict,
  IdempotencyKey,
  PUBLIC_RECORD_ID_PATTERN,
  RECEIPT_ID_PATTERN,
  StoredMgrBatch,
} from "@/lib/contracts/extensions";
import { contractsIdentical } from "../../scripts/contracts-check";

describe("locked contract copy", () => {
  it("is byte-identical to proposal/schemas/events.ts", () => {
    const r = contractsIdentical();
    expect(r.ok).toBe(true);
  });
});

describe("identifier patterns", () => {
  it("accepts CBTMT spelled in full and rejects the CBT abbreviation", () => {
    expect(PublicRecordId.safeParse("BBNJ-CBTMT-2026-00001").success).toBe(true);
    expect(PublicRecordId.safeParse("BBNJ-CBT-2026-00001").success).toBe(false);
    expect(PUBLIC_RECORD_ID_PATTERN.test("BBNJ-MGR-2026-00001")).toBe(true);
    expect(RECEIPT_ID_PATTERN.test("BBNJ-RCPT-2026-00001")).toBe(true);
  });

  it("keeps B-SBI distinct from publicRecordId", () => {
    const bsbi = "BSBI-XSD-2026-00001";
    expect(BSbiStrict.safeParse(bsbi).success).toBe(true);
    expect(BSBI_PATTERN.test(bsbi)).toBe(true);
    expect(PUBLIC_RECORD_ID_PATTERN.test(bsbi)).toBe(false);
  });

  it("rejects short idempotency keys", () => {
    expect(IdempotencyKey.safeParse("short").success).toBe(false);
    expect(IdempotencyKey.safeParse("a".repeat(8)).success).toBe(true);
  });
});

describe("core enums", () => {
  it("validates Domain, ActorRole, ConfidentialityTier, SourceChannel, PublishStatus", () => {
    expect(Domain.options).toEqual(["mgr", "cbtmt", "eia", "abmt"]);
    expect(ActorRole.options).toEqual(["party", "public", "stb", "secretariat", "publishing_authority", "non_state_uploader"]);
    expect(ConfidentialityTier.options).toEqual(["public", "restricted", "confidential"]);
    expect(SourceChannel.options).toEqual(["form", "excel", "assisted"]);
    expect(PublishStatus.options).toEqual(["draft", "pending", "published"]);
  });
});

describe("User, Subscription and Notification models", () => {
  it("validates User schema constraints", () => {
    expect(
      User.safeParse({
        id: "00000000-0000-4000-8000-000000000001",
        username: "user1",
        displayName: "User One",
        roles: ["party"],
        partyCode: "XSD",
        active: true,
      }).success,
    ).toBe(true);

    // Empty username or roles rejected
    expect(User.safeParse({ id: "invalid-uuid", username: "", displayName: "", roles: [] }).success).toBe(false);
  });

  it("validates Subscription and Notification schemas", () => {
    expect(
      Subscription.safeParse({
        id: "00000000-0000-4000-8000-000000000002",
        userId: "00000000-0000-4000-8000-000000000001",
        themes: ["taxonomy"],
        abnjBoxes: ["CCZ"],
        domains: ["mgr"],
        digest: "daily",
      }).success,
    ).toBe(true);

    expect(
      Notification.safeParse({
        id: "00000000-0000-4000-8000-000000000003",
        userId: "00000000-0000-4000-8000-000000000001",
        eventId: "00000000-0000-4000-8000-000000000004",
        kind: "publish",
        at: "2026-09-01T00:00:00.000Z",
        read: false,
        summary: "Published summary",
      }).success,
    ).toBe(true);
  });

  it("validates ArtifactRef schema", () => {
    expect(ArtifactRef.safeParse({ kind: "pdf", label: "Report.pdf", href: "https://example.org/rep.pdf" }).success).toBe(true);
    expect(ArtifactRef.safeParse({ kind: "invalid", label: "" }).success).toBe(false);
  });
});

describe("Domain records schemas", () => {
  it("validates CbtmtNeed, CbtmtOffer and CbtmtMatch", () => {
    expect(
      CbtmtNeed.safeParse({
        domain: "cbtmt",
        kind: "need",
        id: "00000000-0000-4000-8000-000000000020",
        stage: "need_posted",
        title: "Training Need",
        themes: ["genomics"],
        partyCode: "XSD",
        updatedAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);

    expect(
      CbtmtOffer.safeParse({
        domain: "cbtmt",
        kind: "offer",
        id: "00000000-0000-4000-8000-000000000021",
        stage: "offer_posted",
        title: "Training Offer",
        themes: ["genomics"],
        provider: "Ocean Lab",
        updatedAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);

    expect(
      CbtmtMatch.safeParse({
        id: "00000000-0000-4000-8000-000000000022",
        needId: "00000000-0000-4000-8000-000000000020",
        offerId: "00000000-0000-4000-8000-000000000021",
        rule: "shared_theme:genomics",
        at: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("validates EiaActivity and AbnjBox enum", () => {
    expect(AbnjBox.options).toEqual([
      "CCZ",
      "Reykjanes Ridge",
      "Clarion-Clipperton South",
      "Mid-Atlantic Splashdown Corridor",
      "NE Atlantic Mesopelagic Belt",
      "North Atlantic OAE Trial Box",
      "Sargasso Sea Core",
      "Costa Rica Thermal Dome",
    ]);
    expect(
      EiaActivity.safeParse({
        domain: "eia",
        id: "00000000-0000-4000-8000-000000000030",
        currentStage: "screening",
        title: "EIA Survey",
        partyCode: "XSD",
        abnjBox: "CCZ",
        updatedAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});

describe("StoredMgrBatch C1 refine", () => {
  const base = {
    domain: "mgr" as const,
    id: "00000000-0000-4000-8000-000000000010",
    partyCode: "XSD",
    title: "Cruise",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  it("forbids a B-SBI while still in pre_collection", () => {
    const r = StoredMgrBatch.safeParse({ ...base, currentStage: "pre_collection", bSbi: "BSBI-XSD-2026-00001" });
    expect(r.success).toBe(false);
  });

  it("requires a strict-shaped B-SBI after receipt", () => {
    expect(StoredMgrBatch.safeParse({ ...base, currentStage: "batch_id_issued" }).success).toBe(false);
    expect(
      StoredMgrBatch.safeParse({ ...base, currentStage: "batch_id_issued", bSbi: "BSBI-XSD-2026-00001" }).success,
    ).toBe(true);
  });
});

describe("Event discriminated union", () => {
  it("refuses published screening without an Art 31 outcome", () => {
    const r = Event.safeParse({
      id: "00000000-0000-4000-8000-000000000011",
      domain: "eia",
      stage: "screening",
      status: "published",
      recordId: "00000000-0000-4000-8000-000000000012",
      actorRole: "secretariat",
      at: "2026-09-01T00:00:00.000Z",
      summary: "Screening published",
      version: 1,
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid AbmtEvent reserved stub", () => {
    expect(
      AbmtEvent.safeParse({
        id: "00000000-0000-4000-8000-000000000040",
        domain: "abmt",
        stage: "proposal_stub",
        status: "draft",
        recordId: "00000000-0000-4000-8000-000000000041",
        actorRole: "party",
        at: "2026-09-01T00:00:00.000Z",
        summary: "ABMT proposal stub",
        version: 1,
      }).success,
    ).toBe(true);
  });
});
