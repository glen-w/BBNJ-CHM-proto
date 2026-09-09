# BBNJ Cl-HM prototype

**One shared substrate** — receipt → management → publication/notification → user roles — demonstrated through **MGR · EIA · CBTMT** journeys. A one-day, MIT-licensed mini-prototype of the BBNJ Agreement's Clearing-House Mechanism, built to contrast with the interim DOALOS static/informational site.

Repository: [github.com/glen-w/BBNJ-CHM-proto](https://github.com/glen-w/BBNJ-CHM-proto)

## Quick start

```bash
nvm use            # Node 22 (.nvmrc); Node 22–26 works
npm ci
npm run db:seed    # idempotent seed via the domain functions
npm run dev        # http://localhost:3000
```

Docker (seeds on first start, SQLite persists in the `chm-data` volume):

```bash
docker compose up --build
```

Health: [`/api/health`](http://localhost:3000/api/health). Demo walk-through: `DEMO-SCRIPT.md`. Unattended demo path: `npm run demo`.

> **v0.2 (hardening).** Schema is now **v4** — an existing `data/chm.sqlite` from v0.1 refuses to open; run `npm run db:reset` (Docker: `docker compose down -v`). What changed and why: `HARDENING.md`; what is shipped vs deferred against Session‑1 and the EOI criteria: `SHIPPED-VS-DEFERRED.md`.

## Sandbox logins (`/login`)

| Username | Role | Sees |
|---|---|---|
| `party.nfp` | Party — demo Party **XSD** (ISO user-assigned code, no real State) | own drafts/pending + all published |
| `secretariat` | authorised publishing role | everything, full audit projection, Excel import, matching |
| `public` | public | published, public-tier rows only |
| `stb` | Scientific and Technical Body reviewer | published + restricted tier; review queue |

Cookie session, no passwords. A missing, malformed, unknown or inactive cookie is the anonymous public.

## Why this prototype (DOALOS contrast)

| | Interim DOALOS | This prototype |
|---|---|---|
| Intake | informal / static pages | structured forms + offline Excel template + **closed import loop with error workbook** |
| Identifiers | no Art 12 B-SBI | **B-SBI at valid pre-collection receipt**; `publicRecordId` at first publish; never confused |
| Versioning | replace the file | **amend published packs → pending v+1** with change note; material changes re-notify earlier readers |
| Confidentiality | all or nothing | public / restricted / confidential enforced in SQL for every read, export and notification |
| Roles | limited | Party / Secretariat / Public / STB, server-enforced; **every refusal logged** |
| Notify | ad hoc | append-only outbox → subscriptions, bell, **hold + digest runner** |
| Export | none | **CSV / JSON per domain and audit; per-record JSON + PDF stub**, policy-filtered |
| Audit | unclear | every transition is an immutable row; refusals, import runs and digest windows alongside |
| EIA | documents as files | pack-level publish spine |

Static/informational → transactional workflow across Agreement areas — same rails, multiple journeys. See `/compare` (every row deep-links into the live sandbox).

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
6. **Export.** `/api/export/{mgr|eia|cbtmt|audit}.{csv|json}` and `/api/records/<publicRecordId>.{json|pdf}` reuse the policy-filtered queries. The PDF is a hand-rolled one-page text stub, labelled as such.
7. **`/compare`** is organised by the Session‑1 basic functions and deep-links into the live journeys.
8. **Sandbox.** *Reset sandbox* button on `/audit` for the Secretariat when `SANDBOX_RESET=1` (never in production); `npm run demo` runs the 10‑minute journey unattended (add `BASE_URL=` to also check HTTP status codes against a running server).

## Guarantees checked by `npm run smoke`

Runs against a throwaway SQLite file (27 tests): contract copy byte-identical to `proposal/schemas/events.ts`; schema-version gate; identifier regexes; anonymous-on-bad-cookie; role predicates; public/STB never see draft or pending rows; restricted records absent from public feed, counts, audit and notifications; public audit carries no user ids; B-SBI at receipt while publicRecordId is null; draft → submit is one batch and one B-SBI; same idempotency key twice writes nothing; publish twice yields one row and one dispatch; stale version refused; client-supplied versions ignored; STB queue and one-comment rule; Lock 1 coexistence; FK on matches; duplicate match pair ignored; `reconcile()` caches equal event-derived values; `replay-outbox` inserts nothing on a consistent DB; seed idempotency; `db:seed --if-empty` never deletes; `db:reset` refused in production; Excel template/import bounds.

Added in v0.2: role × action matrix (every refusal = exactly one log row, grants none; ownership refusals name the record; log invisible to non‑Secretariat); digest hold semantics (no per-event bell for daily subscribers, one digest row per run, second run inserts nothing, immediate subscribers unaffected, party cannot run digests); import closed loop (2 accepted + 1 rejected, run persisted and idempotent, error workbook has marker + `Error` column + only failed rows, raw report rejected, corrected report accepted with a fresh B-SBI); amendments (pending pack refused, editorial v2 keeps ids and screening outcome, material v3 re-notifies prior recipients exactly once and not the STB, MGR field edits keep B-SBI and history, other Party refused, `reconcile()` clean); tier × role matrix over nine read paths; exports (CSV header = columns, RFC 4180 quoting, anonymous excludes drafts/restricted and user ids, Secretariat includes drafts and keys, JSON envelope, per-record JSON drops owner in public projection, PDF starts `%PDF-1.4` and ends `%%EOF`, invisible record → refusal row); sandbox reset gates.

## Stack (frozen)

Next.js 16 App Router · TypeScript · Zod 4 · shadcn/ui (base-nova) · `better-sqlite3` (no ORM) · `exceljs` · Node 22 · Docker Compose · MIT. Exact versions pinned (`.npmrc` `save-exact`, lockfile committed).

## Latency budget (SIDS / low bandwidth)

Server-rendered HTML, native `<form>` posts (works without client JS), no map tiles, no client data fetching; every page is one round trip plus stylesheet. Offline path: download the `.xlsx` template, fill it offline, the Secretariat imports it (`sourceChannel = excel`).

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
npm run demo             # unattended 10-minute demo path on a temp DB; BASE_URL=http://localhost:3000 adds HTTP checks
npm run contracts:check  # app contract must equal proposal/schemas/events.ts
npm run typecheck / lint
```

Environment: `DATABASE_PATH` (default `data/chm.sqlite`); `SANDBOX_RESET=1` shows the Secretariat's *Reset sandbox* button outside production, `SANDBOX_RESET=force` shows it in a hosted sandbox image (`SANDBOX_RESET=force docker compose up`).

## Layout

| Path | Purpose |
|---|---|
| `src/lib/contracts/events.ts` | **Verbatim copy** of the locked Zod contract (checked byte-for-byte) |
| `src/lib/contracts/extensions.ts` | Implementation-only extensions (B-SBI shape, stored-record shapes, idempotency key) |
| `src/lib/mgr-fields.ts` | `FIELD_DEFS` — one source for form, Zod input, Excel headers, field guide |
| `src/lib/db/` | SQLite schema (constraints for every invariant) + `schema_version` gate |
| `src/server/policy.ts` | `can()`, `requireCan()` (records refusals), the single visibility clause used by every read |
| `src/server/packs.ts` | pack machine: server-side versions, idempotency, mints, publish, **amend** |
| `src/server/notify.ts` | idempotent dispatcher + `dispatch_log`, replay, hold semantics, material re-notify |
| `src/server/digest.ts` | digest runner over held publications (`digest_runs`) |
| `src/server/export.ts` | CSV / JSON / PDF-stub exports over the policy queries |
| `src/server/{mgr,eia,cbtmt}.ts` | journeys through the same machine |
| `src/server/{import,template}.ts` | bounded Excel import with durable runs, template + error-workbook generation |
| `src/server/reset.ts` | CLI and in-process sandbox reset (env-gated) |
| `src/server/seed.ts` | seeds via domain functions with fixed idempotency keys (incl. tiers and a pending amendment) |
| `src/app/` | App Router pages, server actions, `/api/template/mgr.xlsx`, `/api/export/*`, `/api/records/*`, `/api/import/*/errors.xlsx`, `/api/health` |
| `scripts/` | `smoke`, `demo`, `digest`, `seed`, `reset`, `check`, `replay-outbox`, `contracts-check` |

## Planning pack

| File | Purpose |
|---|---|
| `IMPLEMENTATION-PLAN.md` | Sections A–I build plan (behavioural contracts, no code) |
| `HARDENING.md` | v0.2 gap → change → test table for the eight P0 items |
| `SHIPPED-VS-DEFERRED.md` | Checklist against Session‑1 basic functions and EOI preferential criteria |
| `CONTRACT-AMENDMENTS.md` | Proposed folds into the locked contract (C2–C8), none applied |
| `DEMO-SCRIPT.md` | As-built demo walk-through |
| `proposal/PROPOSAL.md` | Product + EOI framing |
| `proposal/PLANNING-AGENT-PROMPT.md` | Locked build contract |
| `proposal/schemas/events.ts` | **Authoritative** Zod contract |
| `proposal/DEMO-SCRIPT.md` | Acceptance journey + DOALOS slide |
| `proposal/KEEPERS.md` | OSS patterns borrowed by re-implementation |
| `context/` | Briefing notes (not shipped in the image) |

## Scope notes

- ABMT is reserved in the contract and disabled in the UI; no fake data.
- The 30-day EIA comment window is a demo value; the Agreement fixes no day count.
- Art 12.2 sub-paragraph letters in `FIELD_DEFS` follow the Agreement text as understood here; verify against the authentic text before external use.
- The B-SBI format `BSBI-<PARTY>-YYYY-NNNNN` is an implementation shape; a reviewed amendment to the proposal contract is proposed in `CONTRACT-AMENDMENTS.md`.
- The PDF export is a stub (plain-text single page, no fonts embedded beyond the base 14) so a viewer opens it; it is not a certified extract.
- "Material change" is a submitter's declaration in this build; the Agreement does not define the term. The flag only widens who is re-notified.
