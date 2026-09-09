# Contract sync — v0.1 build, v0.2 hardening and the EOI wave

`proposal/schemas/events.ts` stayed authoritative throughout. `src/lib/contracts/events.ts` is a verbatim copy, enforced by `npm run contracts:check` (byte comparison, also run inside `npm run smoke`).

**Result of the diff: no change to the locked contract was needed to build or harden the prototype (v0.1, v0.2).** Everything the implementation added lives in `src/lib/contracts/extensions.ts` (which only narrows or extends contract types) and in implementation-only schema columns/tables (`change_note`, `material_change`, `details_history_json`, `access_refusals`, `import_runs`, `digest_runs`; in v5 also `abmt_proposals`, `cbtmt_matches.facilitation_note`, `eia_activities.due_at`, `mgr_batches.tk_provenance_note` / `fpic_status_note`).

**One amendment has since been adopted and applied — C9 (below).** C2–C8 remain reviewed diffs for a decision; nothing else has been applied.

## Adopted amendment C9 — `non_state_uploader` on `ActorRole` (applied, EOI wave)

The PrepCom3 annex names a "registered non-State uploader" as part of the user-role taxonomy. v0.2 modelled four roles and listed the fifth as deferred. The EOI wave adds it as a first-class actor so that audit rows, refusals and pack events can name the role truthfully instead of approximating it as `public`.

Applied to `proposal/schemas/events.ts` and copied verbatim to `src/lib/contracts/events.ts` (byte-identical; `npm run contracts:check` passes):

```diff
 export const ActorRole = z.enum([
   "public",
   "party",
   "stb",
   "secretariat", // authorised publishing role (demo)
   /** ABSCH analogue only — caption in UI; not a prescribed BBNJ organ */
   "publishing_authority",
+  /**
+   * PrepCom3-style registered non-State actor (demo).
+   * May post CBTMT offers only; not a prescribed BBNJ organ.
+   */
+  "non_state_uploader",
 ]);
```

Semantics live in the policy layer, not the contract: `can()` grants `submit` to the role only when the subject is `{ domain: "cbtmt", recordKind: "offer" }`; needs, MGR/EIA/ABMT submissions, amendments, import, publish, matching and every Secretariat action are refused with the reason *non-State uploader may post CBTMT offers only*, each refusal one `access_refusals` row. `readPolicy()` treats the role as an ordinary public reader plus its own rows. Seeded as the fifth login `nonstate.uploader`.

Why adopt rather than extend: an enum value cannot be added from `extensions.ts` without re-declaring `ActorRole`, and every event row carries `actorRole`; leaving the role out of the contract would have forced audit rows to lie. Why it is safe without prejudice: the enum comment states it is a demo role, not a prescribed BBNJ organ, matching the existing `publishing_authority` caveat. Assertions: `npm run smoke` (`non_state_uploader` journey, second role × action matrix, `can()` predicates) and `npm run demo` checkpoint 13.

No other value or type in the contract changed. The remaining sections are unchanged from v0.2 and still describe proposals only.

## Proposed amendment C2 — B-SBI shape (recommended)

The contract deliberately leaves the Art 12 batch identifier as `z.string().min(1)` because the Agreement fixes the duty, not the format. The build had to pick a shape to mint anything at all, and to assert that a B-SBI can never be confused with a `publicRecordId`.

```diff
 /**
  * Art 12 BBNJ standardised batch identifier (B-SBI).
- * Implementation field shape for the demo — minted on valid pre-collection receipt.
+ * Implementation field shape for the demo — minted on valid pre-collection receipt,
+ * before any publish. Format is a demo choice, not an Agreement requirement:
+ *   BSBI-<PARTY 2–3 letters>-<YYYY>-<NNNNN>
+ * The prefix differs from every publicRecordId prefix (BBNJ-…) so the two can
+ * never be mistaken for one another in a UI, a URL or an audit row.
  */
-export const BSbi = z.string().min(1);
+export const BSbi = z.string().regex(/^BSBI-[A-Z]{2,3}-\d{4}-\d{5}$/);
```

Why fold it in: the smoke suite already asserts this shape and asserts non-overlap with `PublicRecordId`; keeping it in `extensions.ts` means the contract is looser than what any consumer can rely on. Why not: if a later session wants the Secretariat (or a future COP decision) to own the format, leaving it as `min(1)` keeps the contract honest. Either is defensible; the build works with both.

## Proposed amendment C3 — MGR Art 12.2 detail fields (recommended as a comment, not a schema change)

`MgrBatch` carries `title`, `locationHint`, `tkFpicFlag`. The prototype stores the remaining Art 12.2(a)–(j) notification fields as a `details` record keyed by `FIELD_DEFS` id (`src/lib/mgr-fields.ts`), so the form, the Excel headers, the field guide and the import validator share one source.

```diff
 export const MgrBatch = z.object({
   ...
   /** Art 13 — metadata-first TK/FPIC flag (no content store) */
   tkFpicFlag: z.boolean().default(false),
+  /**
+   * Implementation: remaining Art 12.2 notification fields, keyed by FIELD_DEFS id.
+   * Kept as an open record so the contract does not have to be re-locked every
+   * time the field guide is corrected against the authentic text.
+   */
+  details: z.record(z.string(), z.string()).default({}),
   updatedAt: z.string().datetime(),
 });
```

## Proposed amendment C4 — ownership pointer (optional)

Party users see their own drafts. That requires knowing who owns a record. Today it is `ownerUserId?: uuid` on the stored shapes only.

```diff
+/** Implementation: who may see this record while it is still draft/pending. */
+const Ownership = { ownerUserId: z.string().uuid().optional() };
 export const MgrBatch    = z.object({ ...Ownership, ... });
 export const EiaActivity = z.object({ ...Ownership, ... });
 export const CbtmtNeed   = z.object({ ...Ownership, ... });
 export const CbtmtOffer  = z.object({ ...Ownership, ... });
```

Argument against: ownership is a policy concern, not a record-content concern; the contract as written describes what is published, and drafts are never published. Leaving it in `extensions.ts` is fine.

## Proposed amendment C5 — name the notification kind enum (housekeeping)

`Notification.kind` is an inline enum; the dispatcher needs it as a value for typed fan-out and currently mirrors it in `extensions.ts`.

```diff
+export const NotificationKind = z.enum(["publish", "deadline", "digest", "match", "stb_review"]);
+export type NotificationKind = z.infer<typeof NotificationKind>;
 export const Notification = z.object({
   ...
-  kind: z.enum(["publish", "deadline", "digest", "match", "stb_review"]),
+  kind: NotificationKind,
```

## Not proposed — storage-only metadata

The outbox row carries `seq` (monotonic ordering) and `idempotencyKey`. These are storage and transport concerns, not contract content, and are typed as `StoredEvent` in `extensions.ts`. Recommend they stay out of `events.ts`.

## v0.2 hardening — three more candidates (contract still untouched)

The eight P0 items were built without editing `events.ts`; `npm run contracts:check` still passes. Three additions sit in `extensions.ts` / schema v4 and are worth a decision.

### Proposed amendment C6 — amendment metadata on published events (recommended)

Every version > 1 of a pack now carries why it exists and whether readers of the earlier version should be told again.

```diff
 const EventBase = z.object({
   ...
   version: z.number().int().min(1),
+  /** Why this version exists (versions > 1). Shown in version history and in the re-notification. */
+  changeNote: z.string().min(1).optional(),
+  /** Submitter's declaration that the change is material → earlier readers are re-notified on publish. */
+  materialChange: z.boolean().default(false),
 });
```

Why fold in: a consumer reading the outbox cannot otherwise tell an editorial re-issue from a substantive one, and the notification text already depends on it. Why not: "material" is a submitter's declaration with no definition in the Agreement; the contract could reasonably leave the semantics to the Secretariat.

### Proposed amendment C7 — notification kind `amendment` (optional)

Amendments are delivered today as `kind: "publish"` with an "amended vN (material change)" summary because the kind enum is locked. A dedicated kind would let clients filter.

```diff
-export const NotificationKind = z.enum(["publish", "deadline", "digest", "match", "stb_review"]);
+export const NotificationKind = z.enum(["publish", "amendment", "deadline", "digest", "match", "stb_review"]);
```

Argument against: the version number on the anchored event already distinguishes them; adding a kind is presentation, not content.

### Proposed amendment C8 — refusal record (not recommended for the contract)

`access_refusals` (actor role/user, action, domain, record, path, reason) is an audit artefact of the policy layer, not something that is ever published or exchanged. Recommend it stays an implementation table, documented in `HARDENING.md`.

| # | Amendment | Recommendation |
|---|---|---|
| C6 | `changeNote` / `materialChange` on events | adopt |
| C7 | `amendment` notification kind | discuss |
| C8 | refusal record | leave in implementation |
| C9 | `non_state_uploader` on `ActorRole` | **adopted — applied** (see above) |

## Zod 4 notes (no action required today)

The contract uses `z.string().uuid()`, `z.string().datetime()` and `z.ZodIssueCode.custom`. All still work on Zod 4.5.4 (`npm run build` and the smoke suite pass), but Zod 4 prefers `z.uuid()`, `z.iso.datetime()` and the string literal `code: "custom"`. If the contract is ever re-locked, take the opportunity to modernise these three; it changes no behaviour.

## Decision requested

| # | Amendment | Recommendation |
|---|---|---|
| C2 | B-SBI regex in contract | adopt |
| C3 | `details` record on `MgrBatch` | adopt |
| C4 | `ownerUserId` on records | leave in extensions |
| C5 | named `NotificationKind` | adopt (cosmetic) |

If C2/C3/C5 are adopted, update `proposal/schemas/events.ts`, copy it verbatim over `src/lib/contracts/events.ts`, delete the corresponding lines from `extensions.ts`, and run `npm run smoke`. The contracts-check will fail loudly if the two files drift — as it did, deliberately, during the C9 fold until both copies matched.

Not proposed for the contract in the EOI wave (implementation / `extensions.ts` only): `abmt_proposals` and `StoredAbmtProposal` (the contract already reserves `AbmtEvent` with `proposal_stub`); `cbtmt_matches.facilitation_note` (Secretariat brokerage metadata, never published as an event); `eia_activities.due_at` (deadline override for digest / notification copy); MGR `tk_provenance_note` / `fpic_status_note` (Art 13 captions beside `tkFpicFlag` — still no content store).
