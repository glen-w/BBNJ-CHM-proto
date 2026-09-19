# BBNJ Cl-HM — plausible seed data pack

**Purpose:** Populate `glen-w/BBNJ-CHM-proto` with demo data that (1) mirrors DOALOS interim pages already live, and (2) adds plausible MGR / EIA / CBTMT / ABMT scenarios a Party NFP would recognise — varied geography, pack stages, channels and confidentiality tiers.

**Not real Party notifications.** Party code `XSD` is the demo SIDS stand-in. Literature links are real; operators/activities are fictional unless marked as interim mirrors.

## Out of the box

These CSVs are the **runtime seed source**. `npm run db:seed`, `db:seed --if-empty` (Docker entrypoint), and `db:reset` load them via `src/server/seed-pack.ts` → `seedFromCsv.ts` → domain APIs (idempotent keys `seed:csv:…`). Edit a CSV, re-seed (or reset) — no separate transpile step.

The image copies `fixtures/` so Compose / production start sees the same pack. Smoke fixtures in `src/server/seed.ts` (DEMO-01…05, CCZ sediment spine, taxonomy match) stay beside this pack.

## Interim UN anchors included

| URL | Role in seed |
|---|---|
| https://www.un.org/bbnjagreement/en/mgr-notifications/bbnj-mgr-temp-2026-001 | MGR batch `mgr-interim-temp-001` |
| https://www.un.org/bbnjagreement/en/Information-sharing/CBTMT | CBTMT themes + related_systems |
| https://www.un.org/bbnjagreement/en/focal-points-formal-communications | Secretariat notice / related link |
| https://www.un.org/bbnjagreement/en/notification-2026-001 | Notif 2026-001 (focal points; 10 Feb 2026) |

## Storylines (CSV pack)

| Domain | Seed key | What it shows |
|---|---|---|
| MGR | `mgr-interim-temp-001` | Interim (DOALOS) TEMP mirror; real B-SBI + public id |
| MGR | `mgr-genomics-pacific` | Published pre + post collection |
| MGR | `mgr-hydrothermal-indian` | Central Indian Ridge; **utilisation** (Art 12.8) |
| MGR | `mgr-sargasso-pending` | Pending only — B-SBI, no public id |
| MGR | `mgr-assisted-sids` | Secretariat-**assisted** channel (Art 51.5) · Tonga-Kermadec |
| MGR | `mgr-southern-edna` | **Restricted** Polar Front eDNA |
| EIA | `eia-rocket-splashdown` (+ neighbour) | Zotero-backed splashdown; draft published |
| EIA | `eia-marine-cdr-oae` (+ neighbour) | mCDR/OAE; draft pending |
| EIA | `eia-mesopelagic-fishery` (+ neighbour) | RFMO-gap screening |
| EIA | `eia-cable-southern` (+ neighbour) | Full spine through **decision + monitoring** |
| EIA | `eia-vent-indian` (+ neighbour) | Vent MSR; draft pending |
| CBTMT | `cbt-need-sids-sequencing` × sequencing-core | SIDS sequencing pair + facilitation note |
| CBTMT | `cbt-need-legal-nfp`, remote-sensing / ship-time offers | **Unmatched** on purpose |
| ABMT | `abmt-sargasso`, `abmt-ccz-precaution` | Published stubs (CCZ has ISA not-undermine caption) |
| ABMT | `abmt-cr-dome`, `abmt-indian-vents` | Pending publish gate |

Related systems also name ABSCH, BCH, OBIS, ISA DeepData and IOC-UNESCO Ocean InfoHub — links, not federation.

## Zotero-backed EIA scenarios

| Scenario | Zotero key | Seed key |
|---|---|---|
| Rocket / controlled re-entry splashdown | `U7EHXJMV` (De Lucia & Guo 2026) | `eia-rocket-splashdown` |
| Marine CDR / OAE pilot | `TU7WCKWE` (Burns & Webb 2026); `P2UZYA3X` | `eia-marine-cdr-oae` |
| Mesopelagic fisheries (RFMO-gap framing) | `6K6WPBFQ` (Gjerde, Wright, Durussel 2021) | `eia-mesopelagic-fishery` |

## Literature snapshot

Zotero remains the catalog of record. `research_items.csv` is a **published metadata slice** the desk can show beside a record. It is not a pack domain: no events, no FTS, no `publicRecordId`, and the Settings switch does not stop the seed from loading the rows.

**The join.** A paper appears on an MGR, EIA, or ABMT record only when both are true: it is tagged with that journey (`pillars`), and its `geographies` include that record’s ABNJ box. Geography is a keyword match on title and abstract against the seeded boxes (Sargasso, CCZ vs Clarion-Clipperton South, splashdown / re-entry, mesopelagic only when the text also says Atlantic / BBNJ / high seas / RFMO, OAE / alkalinity / mCDR, Costa Rica Thermal Dome, Central Indian Ridge, Tonga / Kermadec, Polar Front / Southern Ocean, Reykjanes). A general “Southern Ocean” paper can therefore attach to the Polar Front demo box. That is a demo aid, not a gazetteer. No recognised box, or no shared box, means no panel hit.

**Collections kept** (Zotero keys in `scripts/export-zotero-literature.ts`):

| Collection | Journey | Also tagged |
|---|---|---|
| EIA / SEA | EIA | |
| ABMT / MPAs | ABMT | |
| MGR / ABS / DSI | MGR | |
| CBTMT / equity, finance | CBTMT | |
| Fisheries / RFMOs | EIA | RFMO |
| Seabed / ISA, not-undermine | ABMT | ISA |
| Institutions, clearing-house | *(catalog only — no journey)* | |

Inbox and unsorted context stay out. Item types kept: journal article, report, document, book, book section, conference paper, preprint, thesis, manuscript, recording. The **OA** badge means the licence looks like CC-BY or “open access”, not merely that a URL exists.

One demo row is kept even though it is not in Zotero: *CCZ representative habitats…* (ISA, no key). A refresh merges previous facets by Zotero key or title prefix and does not duplicate that note.

```bash
ZOTERO_SQLITE="/path/to/zotero.sqlite" npx tsx scripts/export-zotero-literature.ts
```

Then `npm run db:reset` in development so the desk picks up the new CSV. The script refuses to run without `ZOTERO_SQLITE`.

## Files

All under `csv/`:

| CSV | Role |
|---|---|
| `csv/abnj_boxes.csv` | Extends / documents `AbnjBox` (must match Zod enum) |
| `csv/abmt_proposals.csv` | Seeded through domain APIs (`abnj_box` is stored on the stub) |
| `csv/research_items.csv` | Literature catalog (not a pack domain). Snapshot of Zotero BBNJ collections plus one demo note. Multi-value `pillars` / `geographies` / `ifbs` use **semicolon**. Seed runs regardless of the Settings gate. Refresh with `ZOTERO_SQLITE=… npx tsx scripts/export-zotero-literature.ts`. |
| `csv/provenance_badges.csv` | Interim (DOALOS) vs Demo scenario list chips |
| `csv/related_systems.csv`, `csv/secretariat_notices.csv` | Related-systems / Institutional notices |
| `csv/sources.csv`, `csv/interim_links.csv` | Provenance documentation (labels/URLs also used from activity rows) |

Optional MGR columns: `source_channel` (`form` / `excel` / `assisted`), `confidentiality`, `status_path` (`receive`, `+publish`, `+post`, `+util`). Optional EIA column: `confidentiality`.

Override the pack root with `SEED_PACK_DIR` if needed (default: this directory).

## Schema note

`AbnjBox` in `src/lib/contracts/events.ts` includes the pack’s geography boxes (`CCZ`, `Reykjanes Ridge`, `Clarion-Clipperton South`, splashdown corridor, mesopelagic belt, OAE trial, Sargasso, Costa Rica Dome, **Central Indian Ridge**, **Tonga-Kermadec Arc**, **Southern Ocean Polar Front**). The neighbourhood schematic is labelled dots, not GIS.
