# BBNJ Cl-HM prototype

**One shared substrate** — receipt → management → publication/notification → user roles — demonstrated through **MGR · EIA · CBTMT** journeys, with a thin **ABMT** stub on the same rails. A one-day, MIT-licensed mini-prototype of the BBNJ Agreement's Clearing-House Mechanism, built to show what a transactional Cl-HM adds alongside the interim informational set-up.

Repository: [github.com/glen-w/BBNJ-CHM-proto](https://github.com/glen-w/BBNJ-CHM-proto)

> A **working Cl-HM desk**: UN-level restraint, product-level clarity — built for Parties to submit, publish, and notify, not to browse a brochure. The look is governed by `VISUAL-CHARTER.md` (a team choice, not an EOI mandate).

**EOI in one line — hands-on, not hosted.** Reviewers get hands-on interaction by cloning this repository (`npm ci && npm run db:seed && npm run dev`) or by `docker compose up --build`; five passwordless sandbox logins cover Party, Secretariat, public, STB reviewer and non-State uploader. There is **no hosted public URL**: public sandbox hosting (criterion C1) is explicitly **out of scope** for this wave, and nothing in this README or the demo script should be read as claiming one.

## UI disclaimer

The **product UI** is written as a finished working desk. Sandbox and legal caveats are documented here (and in related docs), not in chrome:

- Cookie logins, no passwords; roles are demo identities, **not** BBNJ / COP1 organs.
- Demo Party code **XSD** (ISO user-assigned range) — no real State; no real submissions.
- Without prejudice to COP1. MIT licence.
- ABMT is available as a **thin stub** (Art 51.3(a)(ii)): one `proposal_stub` pack per proposal on the same draft → pending → published rails, minting `BBNJ-ABMT-YYYY-NNNNN` at first publish. Without prejudice to COP1; no seeded ABMT data pretends to be a real measure.
- The 30-day EIA comment window is a demo value; the Agreement fixes no day count.
- Notifications are **in-app only** (bell + `/notifications`); there is no e-mail/SMTP. An optional **digest export** (CSV) lets the Secretariat take delivered digest windows out of the sandbox.
- Art 51.5 accessibility is demonstrated as a **pattern**: the offline Excel loop (MGR, plus EIA screening import) with an error workbook. It is **not** a WCAG certification — see `ACCESSIBILITY.md`.
- PDF export is a plain-text one-page extract (not a certified document).
- Database reset on `/audit` appears only when `SANDBOX_RESET=1` (never in production).
- The contrast with the interim set-up lives at [`/compare`](http://localhost:3000/compare) (docs-style page; **not** linked from the shell nav). It describes the interim DOALOS pages as understood from public materials and is a design contrast, not a critique.
- `/cbtmt` is a legacy path and redirects to `/capacity`.

## Quick start

```bash
nvm use            # Node 22 (.nvmrc); engines allow Node >=22 <27
npm ci
npm run db:seed    # idempotent seed via the domain functions
npm run dev        # http://localhost:3000
```

Docker (seeds on first start, SQLite persists in the `chm-data` volume):

```bash
docker compose up --build
```

Health: [`/api/health`](http://localhost:3000/api/health). Demo walk-through: `DEMO-SCRIPT.md`. Unattended demo path: `npm run demo`.

> **EOI wave (schema v6).** Schema is now **v6** (was v5 in the prior EOI cut) — an existing `data/chm.sqlite` from an earlier build refuses to open; run `npm run db:reset` (Docker: `docker compose down -v`). v6 adds SQLite **FTS5** search (`records_fts` + sync triggers) for policy-aware retrieval across MGR / EIA / CBTMT / ABMT, with a global `/search` page and list filters. v5 had added `abmt_proposals`, `cbtmt_matches.facilitation_note`, EIA `due_at`, MGR TK provenance / FPIC status caption columns, and the `non_state_uploader` actor role (contract amendment C9, applied). What changed in v0.2 and why: `HARDENING.md`; what is shipped vs deferred against Session‑1 and the EOI criteria: `SHIPPED-VS-DEFERRED.md`; contract folds: `CONTRACT-AMENDMENTS.md`.

## Sandbox logins (`/login`)

| Username | Role | Sees / may do |
|---|---|---|
| `party.nfp` | Party — demo Party **XSD** (ISO user-assigned code, no real State) | own drafts/pending + all published; submits MGR, EIA, CBTMT needs, ABMT stubs |
| `secretariat` | authorised publishing role | everything, full audit projection, Excel import (MGR + EIA screening), matching, facilitation notes, digest, digest export |
| `public` | public | published, public-tier rows only |
| `stb` | Scientific and Technical Body reviewer | published + restricted tier; review queue |
| `nonstate.uploader` | registered non-State uploader (PrepCom3 annex) | published, public-tier rows; may post **CBTMT offers only** — MGR/EIA/ABMT submission, needs, import, publish are refused and logged |

Cookie session, no passwords. A missing, malformed, unknown or inactive cookie is the anonymous public.

## Why this prototype (contrast with the interim set-up)

The interim Cl-HM pages operated by DOALOS are, as understood from public materials, informational: documents, meeting pages and contact points. That is an appropriate interim posture, not a shortcoming; the table shows what a *transactional* layer adds on top. It is a design contrast, not an assessment of the interim service.

| | Interim set-up (as understood) | This prototype |
|---|---|---|
| Intake | documents and contact points; no structured intake path published | structured forms + offline Excel templates (MGR, EIA screening) + **closed import loop with error workbook** |
| Identifiers | no Art 12 B-SBI yet (not expected before COP1) | **B-SBI at valid pre-collection receipt**; `publicRecordId` at first publish; never confused |
| Versioning | documents re-posted | **amend published packs → pending v+1** with change note; material changes re-notify earlier readers |
| Confidentiality | not surfaced on the public pages | public / restricted / confidential enforced in SQL for every read, export and notification |
| Roles | Secretariat-published content | Party / Secretariat / Public / STB / non-State uploader, server-enforced; **every refusal logged** |
| Notify | none visible | append-only outbox → subscriptions, in-app bell, **hold + digest runner**, optional digest CSV |
| Export | page downloads | **CSV / JSON per domain and audit; per-record JSON + PDF stub**, policy-filtered |
| Audit | not surfaced | every transition is an immutable row; refusals, import runs and digest windows alongside |
| EIA | documents as files | pack-level publish spine with artifact references |
| Interoperability | links to UN pages | **related systems** footer (named links to existing clearing-houses and data systems) — an early seam, not federation |

Informational → transactional workflow across Agreement areas — same rails, multiple journeys. Open `/compare` by URL (every row deep-links into the live app; not in primary nav).

## The four locks (as built)

1. **Pack status, not record status.** `draft → pending → published` lives on each pack row in the outbox; records only cache the latest stage. A published screening and a draft draft-EIA coexist on one activity.
2. **STB sees published draft EIAs only.** `/stb` lists published `draft_eia` packs lacking a `comments_stb` row for the same version; one consolidated comment per version.
3. **Identifiers in order.** `internalId` (UUID, creation) → `receiptId` `BBNJ-RCPT-YYYY-NNNNN` (pack enters pending) → **`bSbi`** `BSBI-<PARTY>-YYYY-NNNNN` (valid MGR pre-collection receipt, *before* any publish) → `publicRecordId` `BBNJ-<MGR|EIA|CBTMT|ABMT>-YYYY-NNNNN` (first publish on the record).
4. **CBTMT match = row + event.** `cbtmt_matches(need, offer, rule, at)` inserted atomically with a `match_suggested` event carrying `matchId`. Deterministic shared-theme rule; no ML.

## Hardening (v0.2) — what the eight P0 items added

1. **Refusal audit.** `requireCan()` writes an `access_refusals` row (actor role/user, action, domain, record, path, reason) before throwing; gated pages and export routes log too. `/audit` shows the log in the Secretariat projection only.
2. **Hold + digest.** Subscribers on `daily`/`weekly` cadence get no per-event bell for subscription matches; `runDigests()` (`npm run digest`, or *Run digest now* on `/notifications`) rolls held publications into one `digest` row per window, recorded in `digest_runs`. Owner, STB, deadline, match and material-amendment rows stay immediate.
3. **Closed import loop.** Every import is a durable `import_runs` row with a page (`/mgr/import/[runId]`); rejected rows keep their values and download as an **error workbook** (same template, `Error` column) for correction and re-import. The bundled fixture includes one invalid row.
4. **Versioning.** `amendPack()` opens pending v+1 of a *published* pack with `change_note` + `material_change`; publishing v>1 re-notifies everyone who held a notification for an earlier version when material. MGR pre-collection amendments may edit Art 12.2 fields; superseded values live in `details_history_json`. Version history on every record page.
5. **Tiers.** Seeds now include a `confidential` MGR batch and a `restricted` EIA activity; CBTMT records take a tier; each record page states who can see it; a tier × role matrix is asserted across lists, packs, audit, feed, resolver, notifications and exports.
6. **Export.** `/api/export/{mgr|eia|cbtmt|audit}.{csv|json}` and `/api/records/<publicRecordId>.{json|pdf}` reuse the policy-filtered queries. The PDF is a hand-rolled one-page text stub, labelled as such. (EOI wave later added `abmt` and Secretariat-only `digests` export domains.)
7. **`/compare`** is organised by the Session‑1 basic functions and deep-links into the live journeys.
8. **Sandbox.** *Reset database* on `/audit` for the Secretariat when `SANDBOX_RESET=1` (never in production); `npm run demo` runs the 10‑minute journey unattended (add `BASE_URL=` to also check HTTP status codes against a running server).

## EOI wave (schema v5 → v6) — what was added

- **v6:** SQLite FTS5 `records_fts` index with sync triggers; policy-aware `searchRecords()`; global `/search` page and list `?q=` filters (MGR / EIA / CBTMT).

1. **Fifth login — non-State uploader (C9).** `non_state_uploader` is now a first-class `ActorRole` in the locked contract (`CONTRACT-AMENDMENTS.md`, adopted and applied). The role may post **CBTMT offers only**; needs, MGR/EIA/ABMT submissions, import and publish are refused by `requireCan()` with a role-specific reason, and each refusal is one `access_refusals` row.
2. **ABMT thin journey.** `abmt_proposals` + a single `proposal_stub` stage on the shared pack machine: draft → pending (receipt id) → published (`BBNJ-ABMT-YYYY-NNNNN`). Same visibility clause, same publish idempotency, same audit rows. The ABMT tab is enabled (quiet) — a stub without prejudice, not a fake ABMT data set.
3. **EIA artifacts + screening import.** Packs carry `artifactRefs` (`pdf | url | note | xlsx` + label, optional href) as references, not a file store; seeded EIA packs show them (demo PDF under `public/demo-artifacts/`). An **EIA screening** Excel template (`/api/template/eia-screening.xlsx`) and import mirror the MGR closed loop (durable run, error workbook, re-import).
4. **CBTMT facilitation note.** The Secretariat can annotate a match with a human brokerage note (`facilitation_note`); it is metadata on the match row, not an outbox event, and only the Secretariat may write it.
5. **Honesty edits.** Notifications are stated as in-app only; digest windows can be exported as CSV (`/api/export/digests.csv`); `/compare` and this README describe the interim set-up as understood, not as a critique; `/cbtmt` redirects to `/capacity`; the header language control persists the *treaty-text* locale only (no UI i18n).
6. **P1 polish in the same wave.** MGR TK/FPIC provenance and FPIC status captions (DEMO-05); explicit EIA `dueAt` (overrides the demo 30‑day deadline text); neighbourhood list on EIA detail polished.

## Guarantees checked by `npm run smoke`

Runs against a throwaway SQLite file (**35 tests**). Two EOI tests use a defensive `skip` only if `importEiaScreeningExcel` / `exportDigests` are missing from the build; on the current tree they run and pass. v0.1 base: contract copy byte-identical to `proposal/schemas/events.ts`; schema-version gate; identifier regexes; anonymous-on-bad-cookie; role predicates (incl. non-State uploader subject rules); public/STB never see draft or pending rows; restricted records absent from public feed, counts, audit and notifications; public audit carries no user ids; B-SBI at receipt while publicRecordId is null; draft → submit is one batch and one B-SBI; same idempotency key twice writes nothing; publish twice yields one row and one dispatch; stale version refused; client-supplied versions ignored; STB queue and one-comment rule; Lock 1 coexistence; FK on matches; duplicate match pair ignored; `reconcile()` caches equal event-derived values; `replay-outbox` inserts nothing on a consistent DB; seed idempotency; `db:seed --if-empty` never deletes; `db:reset` refused in production; Excel template/import bounds.

Added in v0.2: role × action matrix (every refusal = exactly one log row, grants none; ownership refusals name the record; log invisible to non‑Secretariat); digest hold semantics (no per-event bell for daily subscribers, one digest row per run, second run inserts nothing, immediate subscribers unaffected, party cannot run digests); import closed loop (2 accepted + 1 rejected, run persisted and idempotent, error workbook has marker + `Error` column + only failed rows, raw report rejected, corrected report accepted with a fresh B-SBI); amendments (pending pack refused, editorial v2 keeps ids and screening outcome, material v3 re-notifies prior recipients exactly once and not the STB, MGR field edits keep B-SBI and history, other Party refused, `reconcile()` clean); tier × role matrix over nine read paths; exports (CSV header = columns, RFC 4180 quoting, anonymous excludes drafts/restricted and user ids, Secretariat includes drafts and keys, JSON envelope, per-record JSON drops owner in public projection, PDF starts `%PDF-1.4` and ends `%%EOF`, invisible record → refusal row); sandbox reset gates.

Added in the EOI wave: ABMT stub (draft → pending → publish mints `BBNJ-ABMT-`, idempotent replay, public/STB blind to pending, party cannot publish, resolver + audit + derived caches agree, `reconcile()` clean); non-State uploader (seeded fifth login; CBTMT offer accepted with `actorRole = non_state_uploader`; need, MGR draft/receipt, EIA, ABMT, publish and import each refused with exactly one refusal row naming the role; uploader never sees the refusal log; Secretariat publishes the offer normally); a second role × action matrix for the uploader; seeded EIA artifacts (non-empty, parse against `ArtifactRef`, visible in the public projection, round-trip through `addEiaPack`); EIA screening import closed loop (fixture with an invalid row, Secretariat-only, idempotent run, MGR fixture rejected, error workbook + corrected re-import); facilitation note (seeded match carries one; setting it adds no event; empty/orphan refused; party/STB/public/uploader refused and logged); digest export (Secretariat-only, one row per digest window, CSV header = columns, nobody else gets rows).

## Stack (frozen)

Next.js 16 App Router · TypeScript · Zod 4 · shadcn/ui (base-nova) · `better-sqlite3` (no ORM) · `exceljs` · Node 22 · Docker Compose · MIT. Exact versions pinned (`.npmrc` `save-exact`, lockfile committed).

## Latency budget (SIDS / low bandwidth)

Server-rendered HTML, native `<form>` posts (works without client JS), no map tiles, no client data fetching; every page is one round trip plus stylesheet. Offline path: download the `.xlsx` template (MGR pre-collection or EIA screening), fill it offline, the Secretariat imports it (`sourceChannel = excel`). This is the Art 51.5 **pattern proof**; it is not a WCAG certification (`ACCESSIBILITY.md`).

## Scripts

```bash
npm run dev              # local development
npm run build && npm start
npm run smoke            # acceptance suite on a temp DB (npm run smoke -- p0 for the gate)
npm run db:seed          # idempotent seed; --if-empty for startup (never deletes)
npm run db:reset         # DEV/TEST ONLY: delete + recreate + seed (refused in production)
npm run db:check         # contracts:check + reconcile caches vs outbox
npm run replay-outbox    # re-dispatch every published event (0 inserts on a consistent DB)
npm run digest           # roll held publications into digest rows (--cadence daily|weekly, --only-due)
npm run demo             # unattended 10-minute demo path on a temp DB (17 checkpoints); BASE_URL=http://localhost:3000 adds HTTP checks
npm run contracts:check  # app contract must equal proposal/schemas/events.ts
npm run typecheck / lint
npm test                 # Vitest unit suite (temp SQLite harnesses; does not touch data/chm.sqlite)
```

Environment: `DATABASE_PATH` (default `data/chm.sqlite`); `SANDBOX_RESET=1` shows the Secretariat's *Reset sandbox* button outside production, `SANDBOX_RESET=force` shows it in a hosted sandbox image (`SANDBOX_RESET=force docker compose up`).

## Layout

| Path | Purpose |
|---|---|
| `src/lib/contracts/events.ts` | **Verbatim copy** of the locked Zod contract (checked byte-for-byte) |
| `src/lib/contracts/extensions.ts` | Implementation-only extensions (B-SBI shape, stored-record shapes, idempotency key, StoredAbmtProposal, TK captions, EIA `dueAt`) |
| `src/lib/mgr-fields.ts` | `FIELD_DEFS` — one source for form, Zod input, Excel headers, field guide |
| `src/lib/eia-fields.ts` | EIA screening field definitions — one source for Excel headers and import validator |
| `src/lib/db/` | SQLite schema **v6** (FTS5 search; v5 EOI tables retained) (constraints for every invariant) + `schema_version` gate |
| `src/server/policy.ts` | `can()`, `requireCan()` (records refusals), the single visibility clause used by every read |
| `src/server/packs.ts` | pack machine: server-side versions, idempotency, mints, publish, **amend** |
| `src/server/notify.ts` | idempotent dispatcher + `dispatch_log`, replay, hold semantics, material re-notify; deadline text prefers explicit EIA `dueAt` |
| `src/server/digest.ts` | digest runner over held publications (`digest_runs`) |
| `src/server/export.ts` | CSV / JSON / PDF-stub exports over the policy queries (`mgr` / `eia` / `cbtmt` / `abmt` / `audit` / Secretariat `digests`) |
| `src/server/{mgr,eia,cbtmt,abmt}.ts` | journeys through the same machine (ABMT is the thin `proposal_stub` journey; CBTMT carries `setMatchFacilitationNote`) |
| `src/server/{import,template}.ts` | bounded Excel import with durable runs (MGR pre-collection, EIA screening), template + error-workbook generation |
| `src/server/reset.ts` | CLI and in-process sandbox reset (env-gated) |
| `src/server/seed.ts` | seeds via domain functions with fixed idempotency keys (incl. tiers, a pending amendment, EIA artifacts, facilitation note, TK captions, five logins) |
| `src/app/` | App Router pages, server actions, `/api/template/{mgr,eia-screening}.xlsx`, `/api/export/*`, `/api/records/*`, `/api/import/*/errors.xlsx`, `/api/health`; `/cbtmt` → `/capacity` redirect in `next.config.ts` |
| `scripts/` | `smoke`, `demo`, `digest`, `seed`, `reset`, `check`, `replay-outbox`, `contracts-check` |

## Planning pack

| File | Purpose |
|---|---|
| `IMPLEMENTATION-PLAN.md` | **Historical** day‑1 Ultra plan (A–I); not product status — see banner in that file |
| `HARDENING.md` | v0.2 gap → change → test ledger for the eight P0 items (schema was v4 then; live schema is v5) |
| `SHIPPED-VS-DEFERRED.md` | Checklist against Session‑1 basic functions and EOI preferential criteria (**current truth**) |
| `CONTRACT-AMENDMENTS.md` | Folds into the locked contract: C2–C8 proposed (not applied); **C9 `non_state_uploader` adopted and applied** |
| `DEMO-SCRIPT.md` | As-built demo walk-through (five logins, ABMT stub, EOI checkpoints) |
| `VISUAL-CHARTER.md` | "Working Cl-HM desk" visual identity: tokens, chips, shell, accessibility, voice |
| `ACCESSIBILITY.md` | UN WCAG 2.1 AA / POUR assessment and remediation backlog |
| `proposal/PROPOSAL.md` | Product + EOI framing |
| `proposal/PLANNING-AGENT-PROMPT.md` | Locked build contract |
| `proposal/schemas/events.ts` | **Authoritative** Zod contract |
| `proposal/DEMO-SCRIPT.md` | Day‑1 acceptance sketch + DOALOS slide (**superseded for walk-through** by root `DEMO-SCRIPT.md`) |
| `proposal/KEEPERS.md` | OSS patterns borrowed by re-implementation |
| `context/` | Briefing notes (not shipped in the image) |

## Scope notes

- ABMT is a thin stub (`proposal_stub` only) on the shared rails, offered **without prejudice** to how COP1 shapes area-based management tools; the contract keeps `AbmtEvent` minimal and no stored ABMT proposal pretends to be a real measure.
- Public sandbox hosting (EOI criterion **C1**) is out of scope: hands-on interaction is by clone or Docker, not by a hosted URL.
- Notifications are in-app only; the digest CSV export is an optional way to take delivered windows out of the sandbox, not an e-mail channel.
- The "related systems" footer is a set of named links to existing clearing-houses and data systems — an early interoperability seam, not federation or data exchange.
- The 30-day EIA comment window is a demo value; the Agreement fixes no day count.
- Art 12.2 sub-paragraph letters in `FIELD_DEFS` follow the Agreement text as understood here; verify against the authentic text before external use.
- The B-SBI format `BSBI-<PARTY>-YYYY-NNNNN` is an implementation shape; a reviewed amendment to the proposal contract is proposed in `CONTRACT-AMENDMENTS.md`.
- The PDF export is a stub (plain-text single page, no fonts embedded beyond the base 14) so a viewer opens it; it is not a certified extract.
- "Material change" is a submitter's declaration in this build; the Agreement does not define the term. The flag only widens who is re-notified.
