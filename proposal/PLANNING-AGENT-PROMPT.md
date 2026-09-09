# Prompt for a code-project planning agent

Copy everything below the line into a planning / architecture agent. Attach sibling files in `bbnj-chm-proto/`.

---

## Role

You are a senior full-stack planning agent. **Do not write application code yet.** Produce a concrete **implementation plan** for a one-day Cursor Ultra mini-prototype of a BBNJ Clearing-House Mechanism (Cl-HM) demo aimed at Session‑1 / EOI fit.

Prefer boring libraries and ABSCH/BCH **patterns** (MIT). Never fork AngularJS ABSCH. Call out cuts if time runs short.

## Core framing (locked)

**One shared Cl-HM substrate** — receipt → management → publication/notification → user roles — demonstrated through **three use cases**: MGR, EIA, CBTMT.

Homepage shows shared mechanics first (**Submit → review/manage → publish → notify → audit**), then journey pickers. Domain areas prove the substrate is **generic**, not three mini-apps.

Disabled **ABMT** tab (“not in this build”) + README line: same receipt/publish record can later carry Art 51.3(a)(ii) ABMT packages. Domain enum **reserves `abmt`**.

## Four contract locks (non-negotiable)

### Lock 1 — Pack status vs activity stage
Publish status on **packs** (Event/outbox). Activity has `currentStage` (+ optional `latestPackStatus`). First **published** pack mints `publicRecordId`; later packs reuse it. Public lists records with ≥1 published pack. Published screening can coexist with a later draft `draft_eia` pack.

### Lock 2 — STB visibility
Public and STB never see draft/pending packs. Both may see **published** packs, including published `draft_eia` while the activity is open. STB queue = published `draft_eia` awaiting `comments_stb` events. Published ≠ final decision.

### Lock 3 — Identifiers
- `internalId` = UUID (`crypto.randomUUID()` only)  
- `publicRecordId` = CHM reference (`BBNJ-MGR|EIA|CBTMT-…`) on **first pack publish**  
- `bSbi` = Art 12 **BBNJ standardised batch identifier** (MGR only) on **valid pre-collection receipt** — **not** a synonym of `publicRecordId`, **not** delayed until “publish”

### Lock 4 — CBTMT match is a row
`cbtmt_matches(needId, offerId, rule, at)` + outbox `match_suggested` referencing `matchId`. No ML.

## Session‑1 contracts (also locked)

- **Users / roles** in schema (`User`, role bindings) — not CSS-only skins. Demo accounts: party.nfp · secretariat · public (+ stb). Publisher label: **Secretariat / authorised publishing role (demo)**; `publishing_authority` only as ABSCH-analogue caption.
- **Notifications** as data: `Subscription` + `Notification` fed by outbox (bell + preferences drawer). Kinds include publish, deadline, digest, match, stb_review.
- **SIDS / offline:** Download `.xlsx` template + Secretariat **import stub**; `sourceChannel: form|excel|assisted`; no mandatory map.
- **Confidentiality tier + version** on records/events; Art 13 `tkFpicFlag` metadata-only on MGR.
- **DOALOS contrast:** required in README + `DEMO-SCRIPT.md` slide; optional static `/compare` content page. **No** interactive gap-analysis chrome over the Cl-HM.
- **Neighbourhood strip:** **stretch** — cut first. P0 is submit → validate → publish → alert → audit.
- **`scoping_notice`:** rail UX-only. **`comments_stb`:** events on published `draft_eia`.
- Zod: fields are explicit, validated, traceable to Agreement **or** labelled implementation — not “cannot invent fields.”

## Stack (frozen)

Next.js App Router · TypeScript · Zod · shadcn/ui · **better-sqlite3** + small `schema.ts` · UUID only · no Drizzle · no Kafka · MIT repo + Docker Compose target.

## Already drafted

`PROPOSAL.md` · `schemas/events.ts` · `README.md` · `DEMO-SCRIPT.md` · `KEEPERS.md` · `STRATEGY-NOTE.md`

## Non-goals

Fork ABSCH · real SMTP/federation/Solr · full ABMT UI · ABS chain-of-custody · AI translation · neighbourhood as must-ship · inventing non-treaty objects.

## Deliver planning sections A–I

**A.** Exec plan + demo narrative (functions-first) + timebox  
**B.** Routes: home rails, journey entry, `/mgr`, `/eia`, `/capacity`, `/compare` (static), role switcher, STB queue, bell drawer  
**C.** Data model from Zod (users, subscriptions, notifications, packs, matches, mint counters)  
**D.** Domain logic: pack machine, `bSbi` on receipt, `publicRecordId` on first publish, match insert, import stub  
**E.** UI inventory (shared rails first; journeys second; stretch neighbourhood last)  
**F.** Seeds: cross-cutting MGR full path · CBTMT match · EIA `no_eia` · 3-box vocab · 3 users  
**G.** WBS: **App/Zod/rails** · **UI** · **Seeds/mint/outbox** — P0 midday = rails + MGR journey + EIA publish/alert; cut neighbourhood first  
**H.** Risks; ≤5 Glen questions only if still blocking after locks  
**I.** Acceptance: shared rails visible on home; `bSbi` ≠ `publicRecordId`; STB sees published draft_eia; Match has two FKs; offline template+import stub; DOALOS slide/`/compare` content; MIT/sandbox/3 logins documented; ABMT disabled+reserved

## Constraints

No full app dump. Short TS/SQL/path sketches OK. Challenges only in marked **Challenge** subsections; default follows locks. British English.

## Start

A → I. End with remaining Glen questions (≤5) if any.
