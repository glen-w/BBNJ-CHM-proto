Type: ARCHITECTURE
Authority: Dated engineering review of shape and readiness. Does not change the honesty ledger (`docs/SHIPPED.md`) and does not define invariants.

# Codebase assessment — 24 September 2026

Assessment of the BBNJ Cl-HM prototype (`bbnj-chm-proto` 0.1.0) as a working desk, and of what would have to change before the same tree could hold real filings.

**Tree:** reviewed 24 September 2026, parent `227605b`, with the public-docs move, roadmap split, ABMT chrome cleanup, and the EIA/ABMT search case included.  
**Commands run on this tree:** `npm test` (180/180), `npx tsc --noEmit` (clean), `npm run smoke` (36/36).  
**This file is an engineering review.** It does not change [`SHIPPED.md`](SHIPPED.md). A behaviour is still “shipped” only when smoke or demo asserts it.

## Verdict

The prototype does what it claims. Submit, review, publish, notify, and audit sit on one pack machine, one read policy, and one append-only outbox. Identifiers, confidentiality, and role refusals are enforced in the server and checked by an acceptance suite that actually fails the build in CI. TypeScript is `strict`, SQL is parameterised, and there is no `any` and no `dangerouslySetInnerHTML` under `src/`.

It is an evaluation desk. The session is a user id in a cookie. `/login` prints every user id. The only perimeter on a public URL is optional HTTP Basic in `src/proxy.ts`, and that gate is off unless `SANDBOX_BASIC_PASSWORD` is set. `fly.toml` already turns sandbox reset on (`SANDBOX_RESET=force`) and names a public hostname. Shipping that file without the Basic secret would expose Secretariat actions, including wiping the database, to anyone who can open the site.

Treat the repo as ready to demonstrate. Treat it as not ready to receive a real Party filing.

## What was reviewed

| Area | Where it lives |
|---|---|
| Domain rails | `src/server/packs.ts`, `mgr.ts`, `eia.ts`, `cbtmt.ts`, `abmt.ts`, `outbox.ts`, `notify.ts`, `digest.ts` |
| Authorisation | `src/server/policy.ts`, `session.ts` |
| Persistence | `src/lib/db/schema.ts` (schema v7), `src/lib/db/index.ts` |
| Contracts | `src/lib/contracts/events.ts`, `extensions.ts` |
| HTTP surface | `src/app/**`, `src/proxy.ts`, `src/app/api/**` |
| Proof | `scripts/smoke.ts` (36), `scripts/demo.ts` (17 checkpoints), 35 Vitest files (180 cases) |
| Operate | `Dockerfile`, `docker-compose.yml`, `fly.toml`, `.github/workflows/ci.yml` |

Line counts are physical lines, including comments, on this tree:

| Area | Lines | Files |
|---|---:|---:|
| `src/server` | 6,036 | 28 |
| `src/app` | 3,917 | 39 |
| `src/components` | 2,626 | 36 |
| `src/lib` (excluding tests) | 2,137 | 20 |
| `scripts` | 1,816 | 10 |
| Vitest | 3,274 | 35 |

Largest modules: `scripts/smoke.ts` (1,014), `src/server/queries.ts` (534), `src/server/seed-pack.ts` (532), `src/server/actions.ts` (476), `src/server/import.ts` (406).

## Architecture

Next.js 16 App Router, React 19, Node 22, SQLite via `better-sqlite3`. Every page is `force-dynamic` and `nodejs` because the session and the database are read on each request (`src/app/layout.tsx`).

The shape is deliberate and consistent:

1. **Zod is the schema of record.** SQL adds keys, checks, and foreign keys for the same invariants. `SCHEMA_VERSION` is 7. A file whose `meta.schema_version` disagrees with the code refuses to open. There are no migrations.
2. **Pack status lives on `events`.** Records keep a cache (`current_stage`, `latest_pack_status`, `public_record_id`, `b_sbi`). `refreshCaches` and `reconcile()` derive those caches from events, so a drifted cache is detectable.
3. **One authoriser.** `can()` decides mutations. `readPolicy()` plus `visibilityClause()` / `recordVisibilityClause()` decide reads. Lists, detail, audit, FTS, export, and notification fan-out are written to go through that clause.
4. **Publish notifies after commit.** `openPack` / `publishPack` run writes in one transaction. `dispatch()` runs afterwards, is synchronous, and records outcome on `dispatch_log` without rolling the business write back.
5. **Server Actions are adapters.** `actions.ts` maps `FormData` to a domain call and redirects with `notice` / `error`. The domain layer re-reads the cookie principal. Clients do not allocate versions or identifiers.

Four pack domains share that machine: MGR, EIA, CBTMT, and an ABMT proposal whose stage is constrained to `proposal_stub`. Literature (`research_items`) is a published Zotero slice beside the rails: no events, no FTS row, no public record id.

## What is solid

**Identifiers.** B-SBI is minted at a valid MGR pre-collection receipt and is unique. `publicRecordId` (`BBNJ-(MGR|EIA|CBTMT|ABMT)-YYYY-NNNNN`) is minted at first publish. A SQL check requires `b_sbi` to be null exactly while `current_stage = 'pre_collection'`. Smoke asserts the two identifiers are never swapped.

**Roles.** Five demo principals. Non-State upload is limited to CBTMT offers. Refusals append to `access_refusals`. Secretariat is the only publisher, importer, matcher, digest runner, and sandbox resetter.

**Confidentiality.** Tiers are `public` / `restricted` / `confidential`. Public and STB list queries are published-only. Ownership ORs the reader back onto their own rows, which is how a Party sees their drafts. FTS indexes every record, then the SELECT applies `recordVisibilityClause`, so a public match does not return a restricted title. Smoke covers lists, record JSON, packs, audit, feed, resolver, notifications, and CSV/JSON export.

**Idempotency and versioning.** Repeat of the same idempotency key returns the existing event. A second pending pack for the same stage is `already_submitted`. Amendments allocate `version + 1` on the server. Material changes re-notify prior recipients; editorial changes do not.

**Offline intake.** Excel import rejects files over 2 MB and sheets over 200 data rows, checks template magic, persists `import_runs`, and returns an error workbook. Both MGR and EIA screening loops are in smoke.

**Search safety.** `toFtsQuery` strips FTS operators and quotes each token before a prefix match. Column names interpolated into visibility SQL come from call sites, not from the request. `recordTable()` is a closed switch on the domain enum.

**Redirects.** `returnTo` only accepts paths that start with `/`, then `finish()` redirects to `pathname + search` of a URL parsed against a fixed base. A value such as `//evil.example` does not leave the site.

**Honesty.** [`SHIPPED.md`](SHIPPED.md) matches the code: in-app notify, ABMT stub, Excel as an Art 51.5 pattern, literature as a snapshot, no SMTP, no IdP. Accessibility is documented as Partial in [`ACCESSIBILITY.md`](ACCESSIBILITY.md), with measured contrast and a stated absence of an axe gate.

## Findings

Ordered by what would hurt first if this tree were put on a public URL or asked to keep real records. Prototype-local use (clone, or Compose bound to `127.0.0.1`) is the intended deployment, and several items below are acceptable there.

### 1. The desk has no authentication — High if hosted, accepted locally

`chm_demo_user` stores a user UUID (`src/server/session.ts`). It is `httpOnly` and `SameSite=Lax`. It is not signed, and the call does not set `Secure`. `/login` renders every active user id in a hidden field. Knowing or reading that id is enough to become that role, including Secretariat.

`src/proxy.ts` (Next.js 16’s proxy, the former middleware) applies HTTP Basic only when `SANDBOX_BASIC_PASSWORD` is set. Otherwise it calls `NextResponse.next()`. `docker-compose.yml` defaults `SANDBOX_RESET` to `0` and publishes `127.0.0.1:3000` only, which matches a local demo. `fly.toml` sets `SANDBOX_RESET=force`, `force_https`, and comments `https://bbnj-chm.glenwright.earth`. The Basic password is a Fly secret, not in the repo. A deploy that forgets the secret serves the full desk, including **Reset database**, with no perimeter.

Basic comparison uses `timingSafeEqual` and equalises length before compare. `/api/health` bypasses Basic so Fly can probe. That route returns `{ ok, tables, databasePath }`, so an unauthenticated caller learns the on-disk path.

### 2. CI does not run the unit suite or the typecheck — Medium

`.github/workflows/ci.yml` runs `contracts:check` and `smoke` on push and pull request. It does not run `npm test` or `tsc --noEmit`. Smoke is the right acceptance gate for the rails (and it passed, 36/36, including one case registered as `p1`). The 180 Vitest cases cover policy edges, FTS query shaping, sandbox reset, digest, and schema refusal that smoke does not repeat line for line. A red unit test can merge today.

There is no browser end-to-end run and no axe/pa11y step. [`ACCESSIBILITY.md`](ACCESSIBILITY.md) already lists that as backlog.

### 3. Schema changes require a wipe — Medium for any hosted volume

`openDatabase` stamps version 7 on an empty file and throws `SchemaVersionError` on any other version. That is the right prototype rule: an old file cannot be half-migrated. A Fly volume created at v7 cannot move to v8 without deleting `chm.sqlite` (and the WAL/SHM sidecars). Seed storylines would be rebuilt; any evaluator data typed into the sandbox would be gone. Pathway 2 in the README still assumes this SQLite file.

### 4. One process, one SQLite file — Medium once a second machine exists

`getDb()` is a process singleton. Journal mode is WAL, foreign keys are on. Notify and digest run in the request that committed the event, and they scan subscriptions in process. `fly.toml` keeps `min_machines_running = 1` and mounts one volume. A second Machine on that volume will contend for the file. The README’s pathway 3 (Postgres, object store, SMTP, a scheduler) is the point this stops being a configuration tweak.

`dispatch()` loads every subscription row per event (`subscribersFor`). Correct at five users. It is an O(users) scan with JSON parse per row, with no queue and no retry beyond `replay-outbox`.

### 5. The production image is a build environment — Low for a demo, poor as a runtime

`Dockerfile` installs Python, make, and g++ on the base stage, and the runner stage is `FROM base`, so those compilers stay in the image that serves traffic. The runner also `npm ci --include=dev` and copies `src/`, `scripts/`, and `fixtures/` so `db:seed --if-empty` can run under `tsx` at start. The container process is root. Reasonable for a one-command demo. It is a large attack surface if the Basic gate is ever the only thing in front of it.

### 6. Error text from unexpected exceptions reaches the browser — Low

`actions.ts` `errorMessage()` returns `Error.message` for anything that is not a `DomainError`, then puts up to 500 characters on `?error=`. Domain errors are written to be shown. A thrown SQLite or filesystem message would be shown too. Flash text is rendered as text, so this is disclosure, not markup injection.

`recordRefusal` swallows a failed insert and still throws the domain error. Under a full disk the user is refused and the audit row is missing. The comment in `policy.ts` states that tradeoff.

### 7. PDF export is a Latin-1 text page — Low, already labelled

`recordPdf` builds a one-page PDF with Helvetica/Courier and `latin1`. Titles outside that repertoire will not survive. The route still sends `Content-Type: application/pdf`. Smoke only checks that the bytes are a PDF. The honesty ledger already calls PDF a stub.

### 8. FTS visibility is a query convention, not a constraint — Low

Triggers in `schema.ts` copy title, party, place, and identifiers for every row, including confidential ones, into `records_fts`. Confidentiality is not an FTS column. Safety depends on every search joining the record table and appending `recordVisibilityClause`. Current call sites do this, and smoke asserts the public reader cannot retrieve restricted or confidential hits. A new query that matches FTS and forgets the clause would leak titles. Nothing in CI greps for a bare `records_fts MATCH`.

### 9. Product limits that are real and already named — informational

These are not defects against the prototype contract. They bound any reading of this tree as an Art 51 platform:

- ABMT stage is only `proposal_stub`.
- Notifications are rows in `notifications`. There is no SMTP.
- UI language is English. Treaty-text locale is a cookie, not a translation.
- No field-level redaction inside a record the reader is allowed to open.
- No object store. Artifacts are `pdf` / `url` / `note` / `xlsx` references.
- Literature place tags are keyword matches against seeded ABNJ box names.
- CBTMT match is theme intersection plus a facilitation note, not a model.
- Speed lab records mocked wire time. The JSONL download is Secretariat-gated (`can(p, "import")` — the same predicate as Excel import, not a dedicated permission).
- `layout.tsx` metadata description names MGR, EIA, and CBTMT and omits ABMT.

## Test evidence (this run)

| Command | Result |
|---|---|
| `npm test` | 35 files, 180 tests, passed in ~2s |
| `npx tsc --noEmit` | exit 0 |
| `npm run smoke` | 36/36 passed (35 registered `p0`, 1 registered `p1`) |

Smoke is the claim ledger: identifier order, role × action refusals, FTS and export non-leakage, STB comment-once, Lock 1 coexistence, Excel closed loops for MGR and EIA, amendments, ABMT publish, non-State offer-only, digest idempotency, reconcile, replay, seed idempotency, sandbox reset gate.

What that suite does not execute: the Next.js proxy, cookie flags, a browser, an axe pass, a second process against one SQLite file, or a schema upgrade of a non-empty database.

## Recommended order of work

If the next milestone is still a local or webinar demo, change little. Set `SANDBOX_BASIC_PASSWORD` before any Fly deploy, and keep reset labelled as a sandbox control.

If the next milestone is a shared URL that more than one evaluator will type into:

1. Fail the process at boot when `NODE_ENV=production` and `SANDBOX_BASIC_PASSWORD` is empty. The proxy’s “off unless configured” behaviour is right for laptops and wrong for `fly.toml`.
2. Add `npm test` and `tsc --noEmit` to the CI job that already runs smoke.
3. Set `Secure` on `chm_demo_user` when the request is HTTPS. Signing the cookie does not matter until logins stop embedding the raw user id; Basic auth remains the real gate until an IdP exists.
4. Stop returning `databasePath` from `/api/health`. A boolean and a schema version are enough for the probe.
5. Before any non-illustrative row is stored, replace the version-stamp refusal with a migration path, and plan the single-writer SQLite limit as a hosting constraint rather than an accident.

Pathway 3 items in [`ROADMAP.md`](ROADMAP.md) (Postgres, SMTP, institutional IdP, object store, human i18n, a WCAG audit) stay out of this list. They are a different system on the same rails, not a punch list for this repository.
