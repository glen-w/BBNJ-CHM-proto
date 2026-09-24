Type: PRODUCT
Authority: Public honesty ledger — what `npm run smoke` and `npm run demo` assert. Does not define schemas or roles; those live in `src/lib/contracts/events.ts` and `src/server/policy.ts`.

<img src="../public/bbnj-emblem.svg" alt="" width="40" height="40" />

# Clearing House

Biodiversity Beyond National Jurisdiction

# What is shipped (public honesty ledger)

**Schema v7 · smoke 36/36 · FTS5 · Interim/Demo badges · printable `/exhibit`.**  
A claim is **shipped** only when `npm run smoke` or `npm run demo` asserts it. This file is the public summary for a fresh clone. The longer EOI checklist lives in the gitignored `internal/` archive (`npm run internal:restore`).

## Asserted now

| Area | What you can show | Stated limit |
|---|---|---|
| Rails | Submit → manage → publish → notify → audit on one substrate (MGR, EIA, CBTMT, thin ABMT) | ABMT is `proposal_stub` only |
| Identifiers | B-SBI at valid MGR receipt; `publicRecordId` at first publish; never equal / swapped | B-SBI shape is a demo choice |
| Offline Excel | MGR + EIA screening template → import → error workbook → re-import | Art 51.5 **pattern**, not WCAG cert; no Word; no CBTMT/ABMT Excel |
| Search | Policy-aware FTS5 (`/search` + list `?q=`); Interim (DOALOS) vs Demo scenario badges | No Solr / federation |
| Notify | In-app bell + preferences + on-demand digests (+ Secretariat digest CSV) | **No SMTP / e-mail** |
| Confidentiality | public / restricted / confidential on every read path; refusal log | No field-level redaction inside a public record |
| Compare | `/compare` by Session 1 basic function with live deep links | Interim column = public DOALOS pages as understood, dated |
| Exhibit | `/exhibit` printable evaluator one-pager (criteria + live inventory + logins) | Print from the browser; chrome hides |
| Related research | Zotero BBNJ snapshot in `research_items` (smoke: at least three published rows) + Literature nav (`/research`) | Snapshot, not a live Zotero sync; place join is keyword match, not a gazetteer; no file store. The panel filter itself is not a smoke case |
| Neighbourhood | Same ABNJ box: smoke requires ≥2 published EIA activities per storyline box; schematic + list on the activity page | Vocabulary diagram, not GIS tiles |
| EIA artifacts | Packs carry `artifactRefs` (PDF / URL / note). Smoke and demo assert the refs survive the public projection | References only — no blob store |
| Speed lab | Settings → Speed (`/settings?tab=speed`); `npm run demo` with `BASE_URL` fetches that page. `/lab/speed` redirects | Wire time is **calculated** from a nominal profile; parse time is measured on a validate-only pass. Not a field measurement, and not one of the 36 smoke tests |
| Hands-on | Five passwordless logins; clone or Docker; optional `SANDBOX_RESET=1` | **No hosted public URL** yet |
| CI | `.github/workflows/ci.yml` runs `contracts:check` + `smoke` on every push to `main` and on every pull request | No browser e2e / axe gate yet |

## Deliberately not claimed

SMTP/SMS · production IdP/OAuth · full UI i18n (treaty-locale stub only) · GIS / map tiles · federation / Solr · ML matchmaking · WCAG certificate · blob/file store · Word templates · ABMT beyond stub · deep ABS/IP tracing · hosted public sandbox until greenlit · a traditional-knowledge **content** store.

The desk does show Art 13 TK/FPIC **captions** on an MGR record (flag, provenance, consent status). The knowledge itself is not stored. `npm run smoke` and `npm run demo` do not assert that panel; the presenter script does.

## How to verify

```bash
npm run smoke            # 36 acceptance tests on a temp DB
npm run contracts:check  # locked Zod contract loads
npm run demo             # 17 narrated checkpoints
npm run db:check         # contracts + reconcile
```

Presenter talk-track: in-app notify · Excel = pattern · B-SBI ≠ public id · language stub · ABMT without prejudice · literature = Zotero snapshot, not a second library · functions-first `/compare` · printable `/exhibit` · no hosted URL on the EOI slide until it exists.
