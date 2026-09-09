# BBNJ Clearing-House Mechanism — one-day mini-prototype proposal

**Audience:** Cursor Ultra day build  
**Stack:** Next.js · Zod · shadcn/ui · SQLite · nanoid  
**Rule:** Borrow patterns from open CHMs (ABSCH/BCH MIT); do **not** fork AngularJS legacy.

---

## 1. What we’re building

A **demo Cl-HM** for the BBNJ Agreement with three equal pillars:

| Pillar | Treaty focus | Day depth |
|--------|----------------|-----------|
| **MGR** | Art 12 notifications + BBNJ batch IDs | Thin but real stage flow + notify log |
| **Capacity (CBTMT)** | Art 51.3 matchmaking needs ↔ offers | CTCN-style two-column board |
| **EIA** | Part IV Arts 31–34/37 | **Innovation / polish** — public stage rail + cumulative neighbourhood |

Shared substrate (PrepCom “Session‑1 basics”): **receipt → publish/notify → roles**.

---

## 2. What is Zod? (one paragraph)

**Zod** is a TypeScript-first schema library: you declare the shape of data once, and get runtime validation **and** TypeScript types from the same definition. For this demo it plays the role ABSCH “common formats” play in production — every Event / MGR batch / CBTMT card / EIA activity is validated before it hits SQLite or the UI, so we can’t invent fields that aren’t in the contract.

---

## 3. Product shape

### Shell
- Equal top tabs: **MGR · Capacity · EIA**
- Calm institutional chrome (UX): status chips `draft` muted · `pending` amber · `published` teal
- Shared record list: type badge · `publicId` · status chip · updated
- Role skins (same chrome, different unlocks): **Party** (submit) · **Publishing Authority / Secretariat** (flip to published) · **Public / STB** (published-only; STB gets review queue)

### Publish workflow (from ABSCH)
`draft` → Party submits → `pending` → PA/Secretariat publishes → `published`  
Mint human-readable `publicId` **only on first publish** (`BBNJ-MGR-2026-00012`, `BBNJ-EIA-…`, `BBNJ-CBT-…`). Internal id = UUID.

### EIA innovation (deep polish)
Vertical stage rail:

`screening` ★ · `planned_activity_notice` ★ · `scoping_notice` · `draft_eia` ★ · `comments_stb` · `decision_conditions` ★ · `monitoring_review` ★

★ = publishable stage packs. Screening covers both “EIA required” and “no EIA” packs (Art 31). Cumulative **neighbourhood** strip = other seeded activities in the same ABNJ box (derived; not a new treaty object).

### MGR (thin)
Stages: `pre_collection` → `batch_id_issued` → `post_collection` → `utilisation` + notification log.

### CBTMT (thin)
`CbtmtNeed` / `CbtmtOffer` cards; optional `match_suggested` event; filters by theme.

---

## 4. Engineering contracts (already drafted)

File: `schemas/events.ts`

- Shared **`Event`**: `id`, optional `publicId`, `domain` (`mgr|cbtmt|eia`), `recordId`, `stage`, `status` (`draft|pending|published`), `actorRole`, `at`, `summary`, `artifactRefs[]`
- Domain records: `MgrBatch`, `CbtmtNeed` | `CbtmtOffer`, `EiaActivity`
- Append-only **`events` outbox** table (no Kafka) — every status/stage change writes a row
- Email-shaped notification UI fed by that outbox (no real mail/federation on day 1)

### Day stack freeze
Next.js App Router · Zod · shadcn/ui · SQLite · nanoid/ulid · plain SQL/Drizzle-or-better-sqlite3

### Explicit non-goals (day 1)
- Forking `scbd/absch.cbd.int`
- Real email / national-node federation / Solr
- End-to-end ABS traceability or AI translation
- Full ABMT module

---

## 5. Open-source keepers (patterns only)

See `/workspace/bbnj-chm-deepdive/BRIEFING-CHM-open-source-borrow.md` (Zotero `T6I7ZF8A` in `7R77ZJFH`).

1. ABSCH/BCH draft → pending → published + PA roles  
2. ABSCH publicId + internal UUID  
3. Schema-typed common formats → Zod  
4. CTCN needs↔offers UX (portal closed; steal IA only)  
5. EIA notification / timeline spine  

Licence note: ABSCH/BCH/CBD CHM = **MIT**. CTCN closed.

---

## 6. Seed plan
4–6 ABNJ EIA activities (shared boxes so neighbourhood isn’t empty), a handful of MGR batches across stages, ~6–8 CBTMT needs/offers with 1–2 suggested matches.

---

## 7. Ownership (when greenlit)
| Role | Owns |
|------|------|
| **engineer** | App shell wiring · Zod validation · EIA stage machine |
| **UX** | Visual system · rail · role skins · CBTMT board layout |
| **Infra** | Seed fixtures · `publicId` mint · events outbox |
| **Researcher** | Treaty sanity-check (done for Session‑1 priorities) |

---

## 8. Suggested Cursor Ultra build order
1. Scaffold Next.js + shadcn + SQLite + drop in `schemas/events.ts`
2. Role switcher + tab shell + shared record list
3. Infra: mint helper + seeds + outbox
4. MGR notify flow (thin)
5. CBTMT needs↔offers board (thin)
6. EIA timeline + neighbourhood (polish last so it can steal the day)

---

## 9. Success criteria for the demo
- Looks like a product, not a treaty PDF  
- Every published field maps to a real Agreement duty  
- Public cannot see draft/pending  
- Switching roles clearly changes affordances  
- EIA rail is the “wow”; MGR + Capacity prove the platform isn’t EIA-only  
