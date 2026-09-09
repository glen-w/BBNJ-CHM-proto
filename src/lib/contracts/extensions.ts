/**
 * Implementation extensions to the locked contract (events.ts).
 *
 * Rules: only narrow or extend contract types; never redefine them.
 * Everything here is an implementation field or shape, labelled as such.
 * proposal/schemas/events.ts stays authoritative (see scripts/contracts-check.ts).
 */
import { z } from "zod";

import {
  ActorRole,
  BSbi,
  CbtmtNeed,
  CbtmtOffer,
  Domain,
  EiaActivity,
  Event,
  MgrBatch,
  PublicRecordId,
  PublishStatus,
  ReceiptId,
  User,
} from "./events";

/** Implementation shape for the Art 12 B-SBI (the Agreement fixes the duty, not the format). */
export const BSBI_PATTERN = /^BSBI-[A-Z]{2,3}-\d{4}-\d{5}$/;
export const BSbiStrict = BSbi.regex(BSBI_PATTERN);

/** Patterns re-exported for assertions (smoke, UI captions). */
export const PUBLIC_RECORD_ID_PATTERN = /^BBNJ-(MGR|EIA|CBTMT|ABMT)-\d{4}-\d{5}$/;
export const RECEIPT_ID_PATTERN = /^BBNJ-RCPT-\d{4}-\d{5}$/;

/** Implementation: idempotency key carried by every mutating form. */
export const IdempotencyKey = z.string().min(8).max(128);
export type IdempotencyKey = z.infer<typeof IdempotencyKey>;

/** Implementation: ownership pointer so Party users can see their own drafts. */
const Ownership = z.object({
  ownerUserId: z.string().uuid().optional(),
});

/** Stored MGR batch: contract + ownership + Art 12.2 detail fields (FIELD_DEFS). */
export const StoredMgrBatch = MgrBatch.extend({
  ...Ownership.shape,
  details: z.record(z.string(), z.string()).default({}),
}).superRefine((val, ctx) => {
  // C1/C2: once the batch has left pre_collection, a strict-shaped B-SBI is required (minted once, at receipt).
  if (val.currentStage !== "pre_collection") {
    if (val.bSbi === undefined) {
      ctx.addIssue({ code: "custom", path: ["bSbi"], message: "B-SBI required once receipt accepted (Art 12)" });
    } else if (!BSBI_PATTERN.test(val.bSbi)) {
      ctx.addIssue({ code: "custom", path: ["bSbi"], message: "B-SBI does not match implementation shape" });
    }
  } else if (val.bSbi !== undefined) {
    ctx.addIssue({ code: "custom", path: ["bSbi"], message: "B-SBI cannot exist before receipt is accepted" });
  }
});
export type StoredMgrBatch = z.infer<typeof StoredMgrBatch>;

export const StoredEiaActivity = EiaActivity.extend(Ownership.shape);
export type StoredEiaActivity = z.infer<typeof StoredEiaActivity>;

export const StoredCbtmtNeed = CbtmtNeed.extend(Ownership.shape);
export const StoredCbtmtOffer = CbtmtOffer.extend(Ownership.shape);
export const StoredCbtmtRecord = z.discriminatedUnion("kind", [StoredCbtmtNeed, StoredCbtmtOffer]);
export type StoredCbtmtRecord = z.infer<typeof StoredCbtmtRecord>;

/** Stored event = contract event + implementation ordering / idempotency metadata. */
export type StoredEvent = z.infer<typeof Event> & {
  seq: number;
  idempotencyKey?: string;
};

/** Anonymous principal used when the cookie is missing, malformed, unknown or inactive. */
export type Principal =
  | { kind: "user"; user: z.infer<typeof User> }
  | { kind: "anonymous" };

export const PublishableStatus = PublishStatus;
export const DomainEnum = Domain;
export const ActorRoleEnum = ActorRole;
export { PublicRecordId, ReceiptId };

/** Notification kinds (mirror of the contract enum, for typed fan-out). */
export const NotificationKind = z.enum(["publish", "deadline", "digest", "match", "stb_review"]);
export type NotificationKind = z.infer<typeof NotificationKind>;

/** Demo value: comment window on a published draft EIA. The Agreement fixes no day count here. */
export const DEMO_COMMENT_WINDOW_DAYS = 30;
