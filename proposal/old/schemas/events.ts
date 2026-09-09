/**
 * BBNJ Cl-HM day prototype — locked shared contracts
 * Event bus + domain records (MGR · CBTMT · EIA)
 * Patterns from ABSCH (draft|pending|published), not a fork.
 */
import { z } from "zod";

export const Domain = z.enum(["mgr", "cbtmt", "eia"]);
export type Domain = z.infer<typeof Domain>;

export const PublishStatus = z.enum(["draft", "pending", "published"]);
export type PublishStatus = z.infer<typeof PublishStatus>;

export const ActorRole = z.enum([
  "party",
  "public",
  "stb",
  "secretariat",
  "publishing_authority",
]);
export type ActorRole = z.infer<typeof ActorRole>;

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
  "screening",
  "planned_activity_notice",
  "scoping_notice",
  "draft_eia",
  "comments_stb",
  "decision_conditions",
  "monitoring_review",
]);
export type EiaStage = z.infer<typeof EiaStage>;

export const Stage = z.union([MgrStage, CbtmtStage, EiaStage]);
export type Stage = z.infer<typeof Stage>;

export const ArtifactRef = z.object({
  kind: z.enum(["pdf", "url", "note"]),
  label: z.string().min(1),
  href: z.string().url().optional(),
});
export type ArtifactRef = z.infer<typeof ArtifactRef>;

/** Mint only on first transition to `published`. */
export const PublicId = z
  .string()
  .regex(/^BBNJ-(MGR|EIA|CBT)-\d{4}-\d{5}$/);

export const Event = z.object({
  id: z.string().uuid(),
  publicId: PublicId.optional(), // absent until first publish
  domain: Domain,
  recordId: z.string().uuid(),
  stage: Stage,
  status: PublishStatus,
  actorRole: ActorRole,
  at: z.string().datetime(),
  summary: z.string().min(1),
  artifactRefs: z.array(ArtifactRef).default([]),
});
export type Event = z.infer<typeof Event>;

// --- Domain records ---

export const MgrBatch = z.object({
  domain: z.literal("mgr"),
  id: z.string().uuid(),
  publicId: PublicId.optional(),
  status: PublishStatus,
  stage: MgrStage,
  partyCode: z.string().min(2).max(3),
  title: z.string().min(1),
  locationHint: z.string().optional(),
  updatedAt: z.string().datetime(),
});
export type MgrBatch = z.infer<typeof MgrBatch>;

export const CbtmtNeed = z.object({
  domain: z.literal("cbtmt"),
  kind: z.literal("need"),
  id: z.string().uuid(),
  publicId: PublicId.optional(),
  status: PublishStatus,
  title: z.string().min(1),
  themes: z.array(z.string()).default([]),
  partyCode: z.string().min(2).max(3),
  updatedAt: z.string().datetime(),
});
export type CbtmtNeed = z.infer<typeof CbtmtNeed>;

export const CbtmtOffer = z.object({
  domain: z.literal("cbtmt"),
  kind: z.literal("offer"),
  id: z.string().uuid(),
  publicId: PublicId.optional(),
  status: PublishStatus,
  title: z.string().min(1),
  themes: z.array(z.string()).default([]),
  provider: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type CbtmtOffer = z.infer<typeof CbtmtOffer>;

export const CbtmtRecord = z.discriminatedUnion("kind", [CbtmtNeed, CbtmtOffer]);
export type CbtmtRecord = z.infer<typeof CbtmtRecord>;

export const EiaActivity = z.object({
  domain: z.literal("eia"),
  id: z.string().uuid(),
  publicId: PublicId.optional(),
  status: PublishStatus,
  stage: EiaStage,
  screeningOutcome: z.enum(["eia_required", "no_eia"]).optional(),
  title: z.string().min(1),
  partyCode: z.string().min(2).max(3),
  abnjBox: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type EiaActivity = z.infer<typeof EiaActivity>;

/** EIA stage packs that may be CHM-published (Arts 31/32/33/34/37). */
export const EiaPublishableStages = [
  "screening",
  "planned_activity_notice",
  "draft_eia",
  "decision_conditions",
  "monitoring_review",
] as const satisfies ReadonlyArray<z.infer<typeof EiaStage>>;
