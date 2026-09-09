# Demo script (5–10 minutes) + DOALOS slide

> **Day‑1 pack sketch.** For the as-built walk-through (five logins, ABMT stub, facilitation notes, Excel loops, refusals), use the root [`DEMO-SCRIPT.md`](../DEMO-SCRIPT.md). This file keeps the original narration outline and DOALOS slide.

## Three sandbox logins
1. **party.nfp** — Party / NFP-linked submitter  
2. **secretariat** — authorised publishing role (demo)  
3. **public** — view published packs only (switch to **stb** for draft-EIA review queue)

*(Root demo also uses `stb` and `nonstate.uploader`.)*

## Participant journey
1. **Home** — shared rails visible: Submit → manage → publish → notify → audit (not pillar marketing).  
2. **MGR journey** — submit pre-collection (`sourceChannel: form`) → valid receipt mints **`bSbi`** → pending pack → Secretariat publishes → `publicRecordId` appears → bell fires → audit outbox. Optional: download Excel template / show import stub.  
3. **EIA journey** — open activity with published screening (`no_eia` or full path) → show pack chips coexisting → as STB, open review queue on published `draft_eia` → subscription preference for an `abnjBox`.  
4. **CBTMT** — need + offer + seeded match chip.  
5. **ABMT tab** — day‑1 plan had this disabled; **as-built** enables a quiet thin stub (see root demo).  
6. **Close** — DOALOS slide (below) or open static `/compare`.

## DOALOS slide (required narration / deck)
**Title:** Interim DOALOS Cl-HM → transactional prototype  

| | Interim | Prototype |
|---|---|---|
| Intake | Informal / static pages | Structured forms + offline template |
| Identifiers | No Art 12 B‑SBI | `bSbi` on valid pre-collection receipt |
| Roles | Limited | Party / Secretariat / Public / STB |
| Notify | Ad hoc | Outbox + subscriptions / digests |
| Audit | Unclear | Append-only pack events |
| EIA | Documents as files | Pack-level publish spine |

**Line:** *Static/informational → transactional workflow across Agreement areas — same rails, multiple journeys.*

## Stretch (only if time)
Cumulative neighbourhood strip on EIA.
