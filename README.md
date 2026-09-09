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

Health: [`/api/health`](http://localhost:3000/api/health). Demo walk-through: `DEMO-SCRIPT.md`.

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
| Intake | informal / static pages | structured forms + offline Excel template |
| Identifiers | no Art 12 B-SBI | **B-SBI at valid pre-collection receipt** |
| Roles | limited | Party / Secretariat / Public / STB, server-enforced |
| Notify | ad hoc | append-only outbox → subscriptions, bell, digests |
| Audit | unclear | every transition is an immutable row |
| EIA | documents as files | pack-level publish spine |

Static/informational → transactional workflow across Agreement areas — same rails, multiple journeys. See `/compare`.

## The four locks (as built)

1. **Pack status, not record status.** `draft → pending → published` lives on each pack row in the outbox; records only cache the latest stage. A published screening and a draft draft-EIA coexist on one activity.
2. **STB sees published draft EIAs only.** `/stb` lists published `draft_eia` packs lacking a `comments_stb` row for the same version; one consolidated comment per version.
3. **Identifiers in order.** `internalId` (UUID, creation) → `receiptId` `BBNJ-RCPT-YYYY-NNNNN` (pack enters pending) → **`bSbi`** `BSBI-<PARTY>-YYYY-NNNNN` (valid MGR pre-collection receipt, *before* any publish) → `publicRecordId` `BBNJ-<MGR|EIA|CBTMT|ABMT>-YYYY-NNNNN` (first publish on the record).
4. **CBTMT match = row + event.** `cbtmt_matches(need, offer, rule, at)` inserted atomically with a `match_suggested` event carrying `matchId`. Deterministic shared-theme rule; no ML.

## Guarantees checked by `npm run smoke`

Runs against a throwaway SQLite file (20 assertions): contract copy byte-identical to `proposal/schemas/events.ts`; schema-version gate; identifier regexes; anonymous-on-bad-cookie; role predicates; public/STB never see draft or pending rows; restricted records absent from public feed, counts, audit and notifications; public audit carries no user ids; B-SBI at receipt while publicRecordId is null; draft → submit is one batch and one B-SBI; same idempotency key twice writes nothing; publish twice yields one row and one dispatch; stale version refused; client-supplied versions ignored; STB queue and one-comment rule; Lock 1 coexistence; FK on matches; duplicate match pair ignored; `reconcile()` caches equal event-derived values; `replay-outbox` inserts nothing on a consistent DB; seed idempotency; `db:seed --if-empty` never deletes; `db:reset` refused in production; Excel template/import bounds.

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
npm run contracts:check  # app contract must equal proposal/schemas/events.ts
npm run typecheck / lint
```

## Layout

| Path | Purpose |
|---|---|
| `src/lib/contracts/events.ts` | **Verbatim copy** of the locked Zod contract (checked byte-for-byte) |
| `src/lib/contracts/extensions.ts` | Implementation-only extensions (B-SBI shape, stored-record shapes, idempotency key) |
| `src/lib/mgr-fields.ts` | `FIELD_DEFS` — one source for form, Zod input, Excel headers, field guide |
| `src/lib/db/` | SQLite schema (constraints for every invariant) + `schema_version` gate |
| `src/server/policy.ts` | `can()` and the single visibility clause used by every read |
| `src/server/packs.ts` | pack machine: server-side versions, idempotency, mints, publish |
| `src/server/notify.ts` | idempotent dispatcher + `dispatch_log`, replay |
| `src/server/{mgr,eia,cbtmt}.ts` | journeys through the same machine |
| `src/server/{import,template}.ts` | bounded Excel import and template generation |
| `src/server/seed.ts` | seeds via domain functions with fixed idempotency keys |
| `src/app/` | App Router pages, server actions, `/api/template/mgr.xlsx`, `/api/health` |
| `scripts/` | `smoke`, `seed`, `reset`, `check`, `replay-outbox`, `contracts-check` |

## Planning pack

| File | Purpose |
|---|---|
| `IMPLEMENTATION-PLAN.md` | Sections A–I build plan (behavioural contracts, no code) |
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
