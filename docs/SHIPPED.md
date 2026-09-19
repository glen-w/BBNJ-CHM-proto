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
| Related research | Zotero BBNJ snapshot in `research_items` + Literature nav (`/research`) + related panels on ABMT, EIA and MGR | Snapshot, not a live Zotero sync; a paper shows on a record only when journey and place match; no file store |
| Hands-on | Five passwordless logins; clone or Docker; optional `SANDBOX_RESET=1` | **No hosted public URL** yet |
| CI | `.github/workflows/ci.yml` runs `contracts:check` + `smoke` on push/PR to `main` | No browser e2e / axe gate yet |

## Deliberately not claimed

SMTP/SMS · production IdP/OAuth · full UI i18n (treaty-locale stub only) · GIS / map tiles · federation / Solr · ML matchmaking · WCAG certificate · blob/file store · Word templates · ABMT beyond stub · deep ABS/IP tracing · hosted public sandbox until greenlit.

## How to verify

```bash
npm run smoke            # 36 acceptance tests on a temp DB
npm run contracts:check  # locked Zod contract loads
npm run demo             # 17 narrated checkpoints
npm run db:check         # contracts + reconcile
```

Presenter talk-track: in-app notify · Excel = pattern · B-SBI ≠ public id · language stub · ABMT without prejudice · literature = Zotero snapshot, not a second library · functions-first `/compare` · printable `/exhibit` · no hosted URL on the EOI slide until it exists.
