# Coding prompt — integrate plausible seed CSV pack

You are a senior full-stack agent on **https://github.com/glen-w/BBNJ-CHM-proto** (Node 22). Integrate the seed pack at `bbnj-chm-seed-pack/` (CSVs + README) into the app’s idempotent seed path (`src/server/seed.ts` and domain helpers). Do **not** reopen id locks (`bSbi` ≠ `publicRecordId`). British English. Working-desk UI. Label demo/fictional content clearly.

## Inputs
- `bbnj-chm-seed-pack/csv/*.csv`
- `bbnj-chm-seed-pack/README.md`
- Existing `seedDatabase` (keep current smoke seeds **or** merge carefully so smoke still passes)

## Requirements

### 1. Extend geography
Update `AbnjBox` (Zod + DB check constraint/migration if any) to include every `abnj_box` in `abnj_boxes.csv` that is missing. Neighbourhood joins must still work (≥2 published EIA per shared box where the CSV implies it).

### 2. CSV → seed functions
Add a loader (e.g. `src/server/seedFromCsv.ts` or parse at build/seed time) **or** transpile CSVs into typed seed constants committed beside `seed.ts`. Prefer committed generated TS constants if CSV-at-runtime is awkward in Docker. Either way: **idempotent keys** `seed:csv:…` so re-seed is safe.

Wire through existing domain APIs (`receivePreCollection`, `createEiaActivity`, `addEiaPack`, `publishPack`, `createCbtmtRecord`, `suggestMatch`, ABMT stub helpers if present). **No raw SQL inserts** that bypass pack/outbox rules.

### 3. Content mapping
- **MGR:** `mgr-interim-temp-001` mirrors interim TEMP notification — put interim URL on `artifactRefs` / DMP field; summary must mention `BBNJ-MGR-TEMP-2026-001`. Still mint real `bSbi` + `publicRecordId` on valid receipt/publish.
- **EIA:** create activities + packs per `eia_activities.csv` / `eia_packs.csv`; attach literature `ArtifactRef` (url) from Zotero DOIs. Rocket / mCDR / mesopelagic scenarios required.
- **CBTMT:** needs/offers/matches; facilitation_note on match if schema supports it (else summary on `match_suggested` event).
- **ABMT:** stub proposals on same rails; without-prejudice copy; ISA not-undermine caption on CCZ node.
- **Secretariat notices / related_systems:** surface Notification 2026-001 + focal points + CBTMT interim + MGR TEMP in the related-systems strip / compare-adjacent links.

### 4. Honesty
UI/DEMO: “Plausible demo data; not real Party filings.” Interim mirrors cite DOALOS pages. Zotero keys in `sources.csv` may appear in Agreement-basis / artifact labels.

### 5. Tests
Extend smoke/seed tests: interim MGR seed present; three EIA scenarios resolvable by title/seed key; ≥1 published ABMT stub; new AbnjBox values accepted; smoke count still green.

### 6. Docs
Update `DEMO-SCRIPT.md` with a “rich seed” beat (open TEMP MGR → rocket EIA draft → mesopelagic screening → Sargasso ABMT → CBTMT match). Update `SHIPPED-VS-DEFERRED` if seed richness is now claimed.

## Non-goals
Public sandbox URL · scraping live UN HTML into fields beyond the provided URLs · inventing real State party codes · fake email notify.

## Done when
`npm run db:seed` (or project equivalent) loads the pack idempotently; UI shows interim-linked MGR + three EIA storylines + ABMT stubs + CBTMT matches; smoke green; short PR summary mapping CSV files → seed keys.

## Start
Read current `seed.ts` + AbnjBox enum + ABMT route state. Extend boxes. Implement CSV/constants integration. Seed. Smoke. Update DEMO-SCRIPT.

## Team addenda (locked)

- **UX:** List badges must distinguish **Interim (DOALOS)** vs **Demo scenario** so rocket/mCDR/mesopelagic are never read as filed notifications. Keep UI captions short; put Zotero/source depth in the cite drawer / related links, not on every card.
- **Infra:** Mint **B‑SBI on TEMP-2026-001 MGR receipt** (and companion cruises) via the same receipt path as live seeds. Every pack status change must hit the **shared outbox** so audit ribbon/bell aren’t empty on first load. Focal-point links = related_systems/caption only (separate Twenty ingest elsewhere).
- **Researcher:** On mesopelagic activity, cite Zotero `6K6WPBFQ` in the **Agreement-basis drawer** as RFMO-gap / Part IV framing — not only as an artifact URL.
