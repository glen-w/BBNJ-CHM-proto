# Shipped vs deferred — v0.2 against Session‑1 and the EOI criteria

Status legend: **shipped** (in the sandbox, asserted by `npm run smoke` / `npm run demo`) · **partial** (works, with a stated limit) · **deferred** (deliberately not built; reason given). Every "shipped" row names where to see it.

## A. Session‑1 basic functions (webinar brief → consolidated study ¶61)

### 1. Receipt, management and storage of information

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Submission via forms | shipped | `/mgr/new`, `/eia/new`, `/capacity` — fields generated from `FIELD_DEFS`, each cited to Art 12.2(a)–(j) | ABMT reserved, no form |
| Offline / assisted submission (Excel) | shipped | `/api/template/mgr.xlsx` → `/mgr/import` → `/mgr/import/[runId]` → error workbook → re-import (`P0‑3`) | MGR only; Word template not built |
| Validation with actionable feedback | shipped | per-row field-level errors, rejected rows retain values, error workbook pre-filled | — |
| Identifiers (Art 12 B-SBI) | shipped | B-SBI at valid receipt, before publish; `publicRecordId` at first publish; never equal, never swapped (`smoke` identifiers + amend tests) | B-SBI shape is a demo choice (`CONTRACT-AMENDMENTS.md` C2) |
| Version control | shipped | `amendPack()` → pending v+1 with change note + material flag; version history on every record; superseded Art 12.2 values kept (`P0‑4`) | "material" is a submitter's declaration |
| Storage | shipped | SQLite, append-only outbox, caches reconciled from events (`reconcile()`) | single node; federation deferred |
| Search & retrieval | partial | role-filtered lists with `LIKE` search on title/area/ids; stable `/records/<publicRecordId>` | no full-text index (Solr deferred) |
| Reporting & export | shipped | CSV/JSON per domain and audit; per-record JSON; PDF stub (`P0‑6`) | PDF is a one-page text stub |
| Confidentiality controls | shipped | three tiers enforced in SQL for every read path; seeds for all tiers; tier × role matrix (`P0‑5`) | no field-level redaction inside a public record |

### 2. Making information publicly available, including through notifications

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Public record pages | shipped | `/records/<publicRecordId>` resolver; public projection drops owner and user ids | — |
| Publication workflow | shipped | draft → pending → published on the pack; Secretariat publishes; mints on first publish | — |
| Subscription alerts (thematic / geo) | shipped | `/preferences`: domain, ABNJ box, theme; dispatcher fan-out after commit | ABNJ box is a fixed vocabulary, not GIS |
| Digest cadence | shipped | hold semantics for daily/weekly + `runDigests()` (`npm run digest`, UI button), `digest_runs` (`P0‑2`) | run on demand; no scheduler in the image |
| Deadline alerts | shipped | draft EIA publish → deadline row to owner and subscribers (demo 30‑day window) | explicit EIA `dueAt` field deferred (P1) |
| Re-notification on change | shipped | material amendment re-notifies every earlier recipient exactly once | editorial changes notify subscribers only |
| STB review routing | shipped | `stb_review` rows; `/stb` queue; one comment per version | — |
| CBTMT match alerts | shipped | `match_suggested` event → both owners | deterministic rule; no ML |
| Delivery channel | partial | in-app bell + notifications page; `dispatch_log`; replay is a no-op on a consistent DB | e-mail/SMTP deferred by design |

### 3. User management

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Role taxonomy | shipped | Party (NFP) / Secretariat (publishing authority) / STB / public; anonymous on any bad cookie | "registered non-State uploader" not a distinct role |
| Server-side enforcement | shipped | one `can()`, one `requireCan()`, one SQL visibility clause; role × action matrix asserted | — |
| Refusal audit | shipped | `access_refusals` written on every denied action, gated page and export probe; Secretariat-only panel on `/audit` (`P0‑1`) | — |
| Audit logging | shipped | append-only outbox with public and Secretariat projections; CSV/JSON export | — |
| Account lifecycle | partial | seeded users with `active` flag; inactive → anonymous | no self-registration, no OAuth (deferred by design) |
| Ownership | shipped | Party sees own drafts/pending; other Party refused and logged | — |

## B. PrepCom3 annex parameters

| Parameter | Status | Where |
|---|---|---|
| Metadata / offline Excel submission | shipped | `P0‑3` closed loop |
| Confidentiality categories | shipped | three tiers, every read path |
| User role taxonomy | shipped / partial | four roles; non-State uploader role deferred |
| TK as metadata + FPIC flag | partial | `tkFpicFlag` on MGR batches, badge on record page; no content store by design; richer TK metadata UX deferred (P1) |
| Subscription alerts (thematic / geo) | shipped | `/preferences` |
| Early interoperability links | partial | stable public URLs + JSON export are the seam; no external links/federation |
| Design for future nodes | partial | outbox + idempotent dispatch make replication feasible; no node protocol |
| English first, six languages later | deferred | no i18n; light stub was P1 and not reached; no AI translation (PrepCom3 caution respected) |
| Cybersecurity baseline | partial | server-side authorisation, refusal log, no client-side trust, Docker bound to loopback; no OAuth/TLS in the image |
| Art 51.5 accessibility | shipped | SSR HTML, native forms, no map tiles, offline template loop |

## C. EOI preferential criteria

| Criterion | Status | Evidence |
|---|---|---|
| Mini-prototype of ≥1 basic function | shipped | all three functions, one substrate |
| Explicit comparison to DOALOS interim | shipped | `/compare` rewritten by basic function with deep links (`P0‑7`); README table |
| Hands-on interaction | shipped | four sandbox logins, no passwords; `npm run demo` script; *Reset sandbox* button (`SANDBOX_RESET=1`) so a webinar host can restore state between participants (`P0‑8`) |
| Open source | shipped | MIT, pinned lockfile, Docker Compose, contract byte-checked against `proposal/schemas/events.ts` |
| Developing country / SIDS experience | shipped (design) | offline Excel loop with error workbook, low-bandwidth pages, Secretariat-assisted channel (`sourceChannel = assisted|excel`) |
| Prior CHM/portal experience | n/a | a people criterion, not a software one |
| Without prejudice to COP1 | shipped | demo values labelled (30‑day window, B-SBI shape); no fake ABMT data; contract amendments proposed, not applied |

## D. Deferred (with reasons)

| Item | Reason |
|---|---|
| Production authentication (OAuth), SMTP, TLS | Non-goal for a sandbox; cookie sessions make the role model demonstrable without infrastructure |
| Federation / nodes, Solr full-text | Non-goal; single-node SQLite is enough to show the rails |
| ABS chain / IP tracing, ML matching | Non-goal; deterministic shared-theme rule keeps CBTMT honest |
| GIS EIA / map tiles | Non-goal (bandwidth); ABNJ box vocabulary instead |
| ABMT journey shell | P1, not reached; domain reserved in the contract, tab disabled, no fake data |
| Explicit EIA `dueAt` digests | P1, not reached; deadline rows exist, computed from publish date |
| TK/FPIC metadata UX beyond the flag | P1, not reached |
| Light i18n stub | P1, not reached |
| Neighbourhood strip | shipped in v0.1 as a list on `/eia/[id]`; nothing further |
| PDF beyond a stub | hand-rolled single page is enough to prove the export seam; a real renderer is a dependency decision |
| Scheduler for digests | `npm run digest` is cron-ready; no in-process timer in the image |

## E. How to verify

```bash
npm run smoke                                  # 27/27 — invariants incl. all eight P0 items
npm run demo                                   # 13 narrated checkpoints on a temp DB
BASE_URL=http://localhost:3000 npm run demo    # + HTTP status/body checks with each demo cookie
npm run db:check                               # contract byte-check + cache reconcile
```
