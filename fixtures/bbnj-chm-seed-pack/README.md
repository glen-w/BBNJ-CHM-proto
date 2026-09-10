# BBNJ Cl-HM — plausible seed data pack

**Purpose:** Populate `glen-w/BBNJ-CHM-proto` with demo data that (1) mirrors DOALOS interim pages already live, and (2) adds plausible EIA / ABMT scenarios grounded in Glen’s Zotero library.

**Not real Party notifications.** Party code `XSD` is the demo SIDS stand-in. Literature links are real; operators/activities are fictional unless marked as interim mirrors.

## Out of the box

These CSVs are the **runtime seed source**. `npm run db:seed`, `db:seed --if-empty` (Docker entrypoint), and `db:reset` load them via `src/server/seed-pack.ts` → `seedFromCsv.ts` → domain APIs (idempotent keys `seed:csv:…`). Edit a CSV, re-seed (or reset) — no separate transpile step.

The image copies `fixtures/` so Compose / production start sees the same pack.

## Interim UN anchors included

| URL | Role in seed |
|---|---|
| https://www.un.org/bbnjagreement/en/mgr-notifications/bbnj-mgr-temp-2026-001 | MGR batch `mgr-interim-temp-001` |
| https://www.un.org/bbnjagreement/en/Information-sharing/CBTMT | CBTMT themes + related_systems |
| https://www.un.org/bbnjagreement/en/focal-points-formal-communications | Secretariat notice / related link |
| https://www.un.org/bbnjagreement/en/notification-2026-001 | Notif 2026-001 (focal points; 10 Feb 2026) |

## Zotero-backed EIA scenarios

| Scenario | Zotero key | Seed key |
|---|---|---|
| Rocket / controlled re-entry splashdown | `U7EHXJMV` (De Lucia & Guo 2026) | `eia-rocket-splashdown` |
| Marine CDR / OAE pilot | `TU7WCKWE` (Burns & Webb 2026); `P2UZYA3X` | `eia-marine-cdr-oae` |
| Mesopelagic fisheries (RFMO-gap framing) | `6K6WPBFQ` (Gjerde, Wright, Durussel 2021) | `eia-mesopelagic-fishery` |

## ABMT stubs

Sargasso Sea Core · Costa Rica Thermal Dome · CCZ precautionary network node — `abmt_proposals.csv`.

## Files

All under `csv/`:

| CSV | Role |
|---|---|
| `csv/abnj_boxes.csv` | Extends / documents `AbnjBox` (must match Zod enum) |
| `csv/mgr_batches.csv`, `csv/eia_activities.csv`, `csv/eia_packs.csv`, `csv/cbtmt_*.csv`, `csv/abmt_proposals.csv` | Seeded through domain APIs |
| `csv/provenance_badges.csv` | Interim (DOALOS) vs Demo scenario list chips |
| `csv/related_systems.csv`, `csv/secretariat_notices.csv` | Related-systems / Institutional notices |
| `csv/sources.csv`, `csv/interim_links.csv` | Provenance documentation (labels/URLs also used from activity rows) |

Override the pack root with `SEED_PACK_DIR` if needed (default: this directory).

## Schema note

`AbnjBox` in `src/lib/contracts/events.ts` includes the pack’s geography boxes (`CCZ`, `Reykjanes Ridge`, `Clarion-Clipperton South`, splashdown corridor, mesopelagic belt, OAE trial, Sargasso, Costa Rica Dome, etc.).
