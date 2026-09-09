# Shipped vs deferred — EOI wave (schema v5) against Session‑1 and the EOI criteria

Status legend: **shipped** (in the sandbox, asserted by `npm run smoke` / `npm run demo`) · **partial** (works, with a stated limit) · **deferred** (deliberately not built; reason given). Every "shipped" row names where to see it.

Wording rule for this file: a row is **shipped** only when the smoke suite or the demo script asserts it. "Pattern proof" means the behaviour is demonstrated end-to-end but no external certification or standard-conformance claim is made.

## A. Session‑1 basic functions (webinar brief → consolidated study ¶61)

### 1. Receipt, management and storage of information

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Submission via forms | shipped | `/mgr/new`, `/eia/new`, `/capacity`, `/abmt` — MGR fields generated from `FIELD_DEFS`, each cited to Art 12.2(a)–(j); EIA screening fields from `EIA_SCREENING_FIELDS` | ABMT form is a one-field stub (`proposal_stub`) |
| Offline / assisted submission (Excel) | shipped | MGR: `/api/template/mgr.xlsx` → `/mgr/import` → `/mgr/import/[runId]` → error workbook → re-import (`P0‑3`). EIA screening: `/api/template/eia-screening.xlsx` → import → same durable run + error workbook | Word template not built; CBTMT/ABMT have no Excel path |
| Validation with actionable feedback | shipped | per-row field-level errors, rejected rows retain values, error workbook pre-filled (MGR and EIA screening) | — |
| Identifiers (Art 12 B-SBI) | shipped | B-SBI at valid receipt, before publish; `publicRecordId` at first publish (`BBNJ-MGR|EIA|CBTMT|ABMT-…`); never equal, never swapped (`smoke` identifiers + ABMT + amend tests) | B-SBI shape is a demo choice (`CONTRACT-AMENDMENTS.md` C2) |
| Version control | shipped | `amendPack()` → pending v+1 with change note + material flag; version history on every record; superseded Art 12.2 values kept (`P0‑4`) | "material" is a submitter's declaration |
| Artifacts / documents | shipped | `artifactRefs` (`pdf | url | note | xlsx` + label, optional href) on every pack; seeded EIA packs carry them; interim MGR TEMP mirror carries DOALOS URL; shown on the pack and in exports | references only — no file store, no upload |
| Storage | shipped | SQLite, append-only outbox, caches reconciled from events (`reconcile()`), ABMT on the same rails | single node; federation deferred |
| Search & retrieval | partial | role-filtered lists with `LIKE` search on title/area/ids; stable `/records/<publicRecordId>` | no full-text index (Solr deferred) |
| Neighbourhood (same ABNJ box) | shipped | list of other visible activities in the same box on `/eia/[id]` | a list, not a map; ABNJ vocabulary extended for rich seed (splashdown corridor, mesopelagic belt, OAE trial, Sargasso, Costa Rica Dome) |
| Reporting & export | shipped | CSV/JSON per domain and audit; per-record JSON; PDF stub (`P0‑6`); **digest windows CSV** (Secretariat) | PDF is a one-page text stub |
| Confidentiality controls | shipped | three tiers enforced in SQL for every read path; seeds for all tiers; tier × role matrix (`P0‑5`) | no field-level redaction inside a public record |

### 2. Making information publicly available, including through notifications

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Public record pages | shipped | `/records/<publicRecordId>` resolver; public projection drops owner and user ids | — |
| Publication workflow | shipped | draft → pending → published on the pack; Secretariat publishes; mints on first publish — MGR, EIA, CBTMT and the ABMT stub | — |
| Subscription alerts (thematic / geo) | shipped | `/preferences`: domain, ABNJ box, theme; dispatcher fan-out after commit | ABNJ box is a fixed vocabulary, not GIS |
| Digest cadence | shipped | hold semantics for daily/weekly + `runDigests()` (`npm run digest`, UI button), `digest_runs` (`P0‑2`) | run on demand; no scheduler in the image |
| Deadline alerts | shipped | draft EIA publish → deadline row to owner and subscribers; explicit `dueAt` on the activity (`setEiaDueAt`) overrides the demo 30‑day default | the 30‑day default is a demo value |
| Re-notification on change | shipped | material amendment re-notifies every earlier recipient exactly once | editorial changes notify subscribers only |
| STB review routing | shipped | `stb_review` rows; `/stb` queue; one comment per version | — |
| CBTMT match alerts | shipped | `match_suggested` event → both owners | deterministic rule; no ML |
| CBTMT facilitation | shipped | Secretariat `facilitation_note` on a match (human brokerage); seeded match carries one; not an event | free text; no workflow around it |
| Delivery channel | partial | **in-app only**: bell + `/notifications`; `dispatch_log`; replay is a no-op on a consistent DB; **optional digest CSV export** for the Secretariat | no e-mail/SMTP by design; the export is a file, not a channel |

### 3. User management

| ¶61 element | Status | Evidence | Limit / note |
|---|---|---|---|
| Role taxonomy | shipped | Party (NFP) / Secretariat (authorised publishing role) / STB / public / **registered non-State uploader** (`nonstate.uploader`, fifth login); anonymous on any bad cookie | non-State uploader may post CBTMT offers only; contract still carries ABSCH-analogue `publishing_authority` enum value unused in demo accounts |
| Server-side enforcement | shipped | one `can()`, one `requireCan()`, one SQL visibility clause; role × action matrices asserted for all five roles + anonymous | — |
| Refusal audit | shipped | `access_refusals` written on every denied action, gated page and export probe; role-specific reason for the non-State uploader; Secretariat-only panel on `/audit` (`P0‑1`) | — |
| Audit logging | shipped | append-only outbox with public and Secretariat projections; CSV/JSON export | — |
| Account lifecycle | partial | seeded users with `active` flag; inactive → anonymous | no self-registration, no OAuth (deferred by design) |
| Ownership | shipped | Party sees own drafts/pending; other Party refused and logged | — |

## B. PrepCom3 annex parameters

| Parameter | Status | Where |
|---|---|---|
| Metadata / offline Excel submission | shipped | MGR pre-collection and EIA screening closed loops |
| Confidentiality categories | shipped | three tiers, every read path |
| User role taxonomy | shipped | five roles incl. non-State uploader (contract amendment C9, applied) |
| TK as metadata + FPIC flag | partial | `tkFpicFlag` on MGR batches; badge on lists and record page; seeded confidential batch (DEMO-05) carries the flag plus **provenance** and **FPIC status** caption notes (`tk_provenance_note`, `fpic_status_note`); Art 13 cite in § Agreement basis; panel on the record page | **no content store by design** — captions only; no holder registry or consent instrument upload |
| Subscription alerts (thematic / geo) | shipped | `/preferences` |
| Early interoperability links | partial | stable public URLs + JSON export as the seam; **related systems** footer with named links to existing clearing-houses, data systems, and DOALOS interim pages (MGR TEMP, CBTMT, focal points, Notif 2026-001) | links only — no federation, no data exchange |
| Design for future nodes | partial | outbox + idempotent dispatch make replication feasible; no node protocol |
| English first, six languages later | partial | **treaty-text locale stub shipped**: header language control opens the official BBNJ text in the chosen UN language and persists that choice (Arabic RTL on the banner only); **full UI i18n deferred**; no AI translation (PrepCom3 caution respected) |
| Cybersecurity baseline | partial | server-side authorisation, refusal log, no client-side trust, Docker bound to loopback; no OAuth/TLS in the image |
| Art 51.5 accessibility | **partial (pattern proof)** | SSR HTML, native forms, no map tiles, low payload; **offline Excel loop for MGR and EIA screening** with error workbook is the pattern proof for low-bandwidth / assisted access. **Not a WCAG certification** — `ACCESSIBILITY.md` is a living gap analysis |

## C. EOI preferential criteria

| Criterion | Status | Evidence |
|---|---|---|
| Mini-prototype of ≥1 basic function | shipped | all three functions, one substrate, four domains (ABMT thin) |
| Explicit comparison to interim set-up | shipped | `/compare` by basic function with deep links (`P0‑7`); README table. Both describe the interim DOALOS pages *as understood from public materials* and as a design contrast, not a critique |
| Hands-on interaction | shipped (clone / Docker) | **five** sandbox logins, no passwords; `npm run demo`; *Reset sandbox* button (`SANDBOX_RESET=1`) so a host can restore state between participants (`P0‑8`). **Rich seed pack** (idempotent `seed:csv:…`): interim DOALOS TEMP MGR mirror, rocket / mCDR / mesopelagic EIA storylines, ABMT stubs, CBTMT matches — list badges distinguish **Interim (DOALOS)** vs **Demo scenario**. **No hosted public URL — C1 public sandbox hosting is out of scope** |
| Open source | shipped | MIT, pinned lockfile, Docker Compose, contract byte-checked against `proposal/schemas/events.ts` |
| Developing country / SIDS experience | shipped (design) | offline Excel loops with error workbooks, low-bandwidth pages, Secretariat-assisted channel (`sourceChannel = assisted|excel`), non-State uploader for providers; `VISUAL-CHARTER.md` — text-labelled chips, visible focus rings, light payload, no maps or hero imagery (team charter, not an EOI mandate) |
| Prior CHM/portal experience | n/a | a people criterion, not a software one |
| Without prejudice to COP1 | shipped | demo values labelled (30‑day window, B-SBI shape); ABMT stub explicitly without prejudice; contract amendments C2–C8 proposed not applied, C9 applied because the role already existed in the PrepCom3 taxonomy |

## D. Deferred (with reasons)

| Item | Reason |
|---|---|
| Public sandbox hosting (C1) | Out of scope for this wave; clone or Docker gives the same hands-on path without a hosting commitment |
| Production authentication (OAuth), SMTP, TLS | Non-goal for a sandbox; cookie sessions make the role model demonstrable without infrastructure |
| E-mail delivery of notifications | Non-goal; in-app rows + digest CSV export show the semantics without an outbound channel |
| Federation / nodes, Solr full-text | Non-goal; single-node SQLite is enough to show the rails; related-systems footer is links only |
| ABS chain / IP tracing, ML matching | Non-goal; deterministic shared-theme rule + human facilitation note keep CBTMT honest |
| GIS EIA / map tiles | Non-goal (bandwidth); ABNJ box vocabulary instead |
| ABMT beyond the stub | Only `proposal_stub` exists; further stages await COP1 decisions |
| File storage for artifacts | `artifactRefs` are references (label + kind + optional href); no upload or blob store |
| TK/FPIC content store or holder registry | Provenance and FPIC **status captions** ship on MGR batches; storing the knowledge itself or a consent instrument is deferred by design (Art 13) |
| Full UI i18n | treaty-text locale stub shipped; translating the desk itself is deferred; no machine translation |
| PDF beyond a stub | hand-rolled single page is enough to prove the export seam; a real renderer is a dependency decision |
| Scheduler for digests | `npm run digest` is cron-ready; no in-process timer in the image |
| WCAG certification / third-party audit | `ACCESSIBILITY.md` remediations shipped; formal audit not done |

## E. How to verify

```bash
npm run smoke                                  # 35 tests — invariants incl. all eight P0 items + EOI wave (defensive skip only if an EOI API is absent)
npm test                                       # Vitest unit suite (temp SQLite; does not touch data/chm.sqlite)
npm run demo                                   # 17 narrated checkpoints on a temp DB
BASE_URL=http://localhost:3000 npm run demo    # + HTTP status/body checks with each demo cookie (incl. /cbtmt → /capacity, /abmt)
npm run db:check                               # contract byte-check + cache reconcile
```
