/**
 * BBNJ Cl-HM — locked shared contracts
 *
 * Shared rails: receipt → manage → publish/notify → roles
 * Use cases: MGR · EIA · CBTMT (abmt reserved)
 *
 * Identifiers:
 *   internalId (UUID) · publicRecordId (CHM, on first pack publish)
 *   bSbi (Art 12 standardised batch identifier — MGR — on valid pre-collection receipt)
 *
 * Pack status lives on Event rows; activities keep currentStage.
 * Zod makes every field explicit, validated, and traceable to an Agreement
 * requirement or a clearly labelled implementation field.
 */
import { z } from "zod";

export const Domain = z.enum(["mgr", "cbtmt", "eia", "abmt"]);
export type Domain = z.infer<typeof Domain>;

/** Pack-level publish status (source of truth on Event / outbox rows). */
export const PublishStatus = z.enum(["draft", "pending", "published"]);
export type PublishStatus = z.infer<typeof PublishStatus>;

export const ActorRole = z.enum([
  "party", // Party / NFP-linked submitter
  "public",
  "stb",
  "secretariat", // authorised publishing role (demo)
  /** ABSCH analogue only — caption in UI; not a prescribed BBNJ organ */
  "publishing_authority",
  /**
   * PrepCom3-style registered non-State actor (demo).
   * May post CBTMT offers only; not a prescribed BBNJ organ.
   */
  "non_state_uploader",
]);
export type ActorRole = z.infer<typeof ActorRole>;

export const ConfidentialityTier = z.enum([
  "public",
  "restricted",
  "confidential",
]);
export type ConfidentialityTier = z.infer<typeof ConfidentialityTier>;

export const SourceChannel = z.enum(["form", "excel", "assisted"]);
export type SourceChannel = z.infer<typeof SourceChannel>;

export const MgrStage = z.enum([
  "pre_collection",
  "batch_id_issued",
  "post_collection",
  "utilisation",
]);
export type MgrStage = z.infer<typeof MgrStage>;

export const CbtmtStage = z.enum([
  "need_posted",
  "offer_posted",
  "match_suggested",
]);
export type CbtmtStage = z.infer<typeof CbtmtStage>;

export const EiaStage = z.enum([
  "screening", // Art 31 — covers eia_required | no_eia
  "planned_activity_notice", // Art 32 — publishable
  "scoping_notice", // rail UX-only in demo (Art 33 notified in principle)
  "draft_eia", // Art 33/34 — publishable pack; STB consults when published
  "comments_stb", // events on published draft_eia (Arts 34–35), not a separate pack
  "decision_conditions", // Art 34/37 — publishable
  "monitoring_review", // Art 37 — publishable
]);
export type EiaStage = z.infer<typeof EiaStage>;

export const ArtifactRef = z.object({
  kind: z.enum(["pdf", "url", "note", "xlsx"]),
  label: z.string().min(1),
  href: z.string().url().optional(),
});
export type ArtifactRef = z.infer<typeof ArtifactRef>;

/** CHM public record reference — mint on first pack publish. */
export const PublicRecordId = z
  .string()
  .regex(/^BBNJ-(MGR|EIA|CBTMT|ABMT)-\d{4}-\d{5}$/);

/** Optional receipt when a pack enters pending. */
export const ReceiptId = z
  .string()
  .regex(/^BBNJ-RCPT-\d{4}-\d{5}$/);

/**
 * Art 12 BBNJ standardised batch identifier (B-SBI).
 * Implementation field shape for the demo — minted on valid pre-collection receipt.
 */
export const BSbi = z.string().min(1);

// --- Users / notify (Session-1: roles + notifications are contracts, not CSS) ---

export const User = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(ActorRole).min(1),
  partyCode: z.string().min(2).max(3).optional(),
  active: z.boolean().default(true),
});
export type User = z.infer<typeof User>;

export const Subscription = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  themes: z.array(z.string()).default([]),
  abnjBoxes: z.array(z.string()).default([]),
  domains: z.array(Domain).default([]),
  digest: z.enum(["immediate", "daily", "weekly"]).default("daily"),
});
export type Subscription = z.infer<typeof Subscription>;

export const Notification = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  eventId: z.string().uuid(),
  kind: z.enum(["publish", "deadline", "digest", "match", "stb_review"]),
  at: z.string().datetime(),
  read: z.boolean().default(false),
  summary: z.string().min(1),
});
export type Notification = z.infer<typeof Notification>;

const EventBase = z.object({
  id: z.string().uuid(),
  publicRecordId: PublicRecordId.optional(),
  receiptId: ReceiptId.optional(),
  recordId: z.string().uuid(),
  relatedRecordId: z.string().uuid().optional(),
  status: PublishStatus,
  actorRole: ActorRole,
  actorUserId: z.string().uuid().optional(),
  at: z.string().datetime(),
  summary: z.string().min(1),
  artifactRefs: z.array(ArtifactRef).default([]),
  confidentiality: ConfidentialityTier.default("public"),
  version: z.number().int().positive().default(1),
});

export const MgrEvent = EventBase.extend({
  domain: z.literal("mgr"),
  stage: MgrStage,
  bSbi: BSbi.optional(),
});
export type MgrEvent = z.infer<typeof MgrEvent>;

export const CbtmtEvent = EventBase.extend({
  domain: z.literal("cbtmt"),
  stage: CbtmtStage,
  matchId: z.string().uuid().optional(),
});
export type CbtmtEvent = z.infer<typeof CbtmtEvent>;

export const EiaEvent = EventBase.extend({
  domain: z.literal("eia"),
  stage: EiaStage,
  /** Required when stage === screening && status === published (Art 31). */
  screeningOutcome: z.enum(["eia_required", "no_eia"]).optional(),
}).superRefine((val, ctx) => {
  if (
    val.stage === "screening" &&
    val.status === "published" &&
    val.screeningOutcome === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Published screening pack requires screeningOutcome (Art 31)",
      path: ["screeningOutcome"],
    });
  }
});
export type EiaEvent = z.infer<typeof EiaEvent>;

/** Reserved — empty journey; keeps Art 51.3(a)(ii) visible in the model. */
export const AbmtEvent = EventBase.extend({
  domain: z.literal("abmt"),
  stage: z.literal("proposal_stub"),
});
export type AbmtEvent = z.infer<typeof AbmtEvent>;

export const Event = z.discriminatedUnion("domain", [
  MgrEvent,
  CbtmtEvent,
  EiaEvent,
  AbmtEvent,
]);
export type Event = z.infer<typeof Event>;

// --- Domain records ---

export const MgrBatch = z.object({
  domain: z.literal("mgr"),
  id: z.string().uuid(),
  publicRecordId: PublicRecordId.optional(),
  /** Art 12 B-SBI — set on valid pre-collection receipt */
  bSbi: BSbi.optional(),
  currentStage: MgrStage,
  partyCode: z.string().min(2).max(3),
  title: z.string().min(1),
  locationHint: z.string().optional(),
  sourceChannel: SourceChannel.default("form"),
  confidentiality: ConfidentialityTier.default("public"),
  version: z.number().int().positive().default(1),
  /** Art 13 — metadata-first TK/FPIC flag (no content store) */
  tkFpicFlag: z.boolean().default(false),
  updatedAt: z.string().datetime(),
});
export type MgrBatch = z.infer<typeof MgrBatch>;

export const CbtmtNeed = z.object({
  domain: z.literal("cbtmt"),
  kind: z.literal("need"),
  id: z.string().uuid(),
  publicRecordId: PublicRecordId.optional(),
  stage: z.literal("need_posted"),
  title: z.string().min(1),
  themes: z.array(z.string()).default([]),
  partyCode: z.string().min(2).max(3),
  sourceChannel: SourceChannel.default("form"),
  confidentiality: ConfidentialityTier.default("public"),
  version: z.number().int().positive().default(1),
  updatedAt: z.string().datetime(),
});
export type CbtmtNeed = z.infer<typeof CbtmtNeed>;

export const CbtmtOffer = z.object({
  domain: z.literal("cbtmt"),
  kind: z.literal("offer"),
  id: z.string().uuid(),
  publicRecordId: PublicRecordId.optional(),
  stage: z.literal("offer_posted"),
  title: z.string().min(1),
  themes: z.array(z.string()).default([]),
  provider: z.string().min(1),
  sourceChannel: SourceChannel.default("form"),
  confidentiality: ConfidentialityTier.default("public"),
  version: z.number().int().positive().default(1),
  updatedAt: z.string().datetime(),
});
export type CbtmtOffer = z.infer<typeof CbtmtOffer>;

export const CbtmtRecord = z.discriminatedUnion("kind", [CbtmtNeed, CbtmtOffer]);
export type CbtmtRecord = z.infer<typeof CbtmtRecord>;

export const CbtmtMatch = z.object({
  id: z.string().uuid(),
  needId: z.string().uuid(),
  offerId: z.string().uuid(),
  rule: z.string().min(1),
  at: z.string().datetime(),
});
export type CbtmtMatch = z.infer<typeof CbtmtMatch>;

export const AbnjBox = z.enum([
  "CCZ",
  "Reykjanes Ridge",
  "Clarion-Clipperton South",
  "Mid-Atlantic Splashdown Corridor",
  "NE Atlantic Mesopelagic Belt",
  "North Atlantic OAE Trial Box",
  "Sargasso Sea Core",
  "Costa Rica Thermal Dome",
]);
export type AbnjBox = z.infer<typeof AbnjBox>;

export const EiaActivity = z.object({
  domain: z.literal("eia"),
  id: z.string().uuid(),
  publicRecordId: PublicRecordId.optional(),
  currentStage: EiaStage,
  latestPackStatus: PublishStatus.optional(),
  title: z.string().min(1),
  partyCode: z.string().min(2).max(3),
  abnjBox: AbnjBox,
  sourceChannel: SourceChannel.default("form"),
  confidentiality: ConfidentialityTier.default("public"),
  version: z.number().int().positive().default(1),
  updatedAt: z.string().datetime(),
});
export type EiaActivity = z.infer<typeof EiaActivity>;

/**
 * Publishable EIA packs (Arts 31, 32, 33/34, 34/37, 37).
 * scoping_notice + comments_stb are rail/UX or events-on-pack — not separate must-publish packs in the demo.
 */
export const EiaPublishableStages = [
  "screening",
  "planned_activity_notice",
  "draft_eia",
  "decision_conditions",
  "monitoring_review",
] as const satisfies ReadonlyArray<z.infer<typeof EiaStage>>;
