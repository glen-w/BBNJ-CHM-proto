# BBNJ Clearing-House Mechanism — one-day mini-prototype

**Audience:** Cursor Ultra day build + EOI / Session‑1 webinar framing  
**Stack:** Next.js · Zod · shadcn/ui · better-sqlite3 · `crypto.randomUUID()`  
**Licence (day deliverable):** MIT · public GitHub · Docker Compose · seeded sandbox  
**Rule:** Borrow ABSCH/BCH patterns (MIT); do **not** fork AngularJS legacy.  
**Build contract:** `PLANNING-AGENT-PROMPT.md` + `schemas/events.ts` win on conflicts.

---

## 1. Core story (functions first, not pillars)

**One shared Cl-HM substrate** — **receipt → management → publication/notification → user roles** — demonstrated through **three BBNJ use cases**: MGR, EIA, and CBTMT.

That is the Session‑1 / PrepCom ¶61 ask (functional approach). Domain tabs are *journeys through the same rails*, not three mini-apps.

Homepage hierarchy:

1. Shared mechanics: **Submit → review/manage → publish → notify → audit**
2. Then: “See this in an **MGR** / **EIA** / **capacity** journey”
3. Disabled **ABMT** tab: “not in this build” + one-liner that a generic receipt/publish record can later carry an Art 51.3(a)(ii) ABMT proposal package

### Session‑1 basic functions → demo flows

| ¶61 function | Where the audience sees it |
|---|---|
| Receipt / management / storage | MGR pre-collection form → validate → store; optional Excel template → Secretariat import stub; `sourceChannel: form\|excel\|assisted` |
| Public availability + notifications | Pack publish; public pages; **bell + subscription preferences** (thematic + `abnjBox`); deadline/digest mock from outbox |
| User management | Role switcher with **three demo accounts** (NFP/Party submitter · Secretariat publisher · public / STB views); schema-enforced unlocks |

### DOALOS contrast (brief-central)

EOI expects comparison with the interim DOALOS set-up. Make it **explicit in README + scripted demo slide** (“interim static/informational → prototype transactional”). Optional thin static `/compare` **content page** (read-only markdown) — **not** a chrome toggle over the working Cl-HM.

| Interim gap (illustrative) | Prototype shows |
|---|---|
| No Art 12 B‑SBI | `bSbi` on valid pre-collection receipt |
| Weak roles / publish gates | Party → pending → Secretariat publish; STB on published `draft_eia` |
| No subscriptions / digests | Bell + preferences on outbox |
| Thin CBTMT | Needs↔offers + `cbtmt_matches` |
| No pack-level EIA spine | Coexisting published packs on one activity |

---

## 2. Identifiers (legally convincing)

| Id | Meaning | When minted |
|---|---|---|
| `internalId` | Implementation UUID | Create |
| `publicRecordId` | Optional persistent public CHM reference (`BBNJ-MGR\|EIA\|CBTMT-YYYY-#####`) | First **pack publish** (ABSCH-style) |
| `bSbi` | Art 12 **BBNJ standardised batch identifier** (MGR only) | Upon **valid pre-collection receipt** (not on publish; not a synonym of `publicRecordId`) |

Demo caption if forced to collapse: *“production splits CHM record id and B‑SBI; do not conflate.”*

---

## 3. Use cases (prove the substrate is generic)

### MGR journey (P0)
Pre-collection → validate → store → mint **`bSbi`** → draft/pending/published packs → public page + alert + audit log.

### EIA journey (P0)
Pack-level publish (screening incl. **no EIA**, notice, draft EIA, decision, monitoring). STB queue on **published** `draft_eia`. Deadline digest + subscription alert.

**Cumulative neighbourhood** = **stretch** (cut first if the day slips). Nail submit → validate → publish → alert → audit before any map strip.

### CBTMT journey (P0 thin)
Needs↔offers + `cbtmt_matches` + `match_suggested` outbox event.

### ABMT
Out of day‑1 UI depth. Domain enum **reserves `abmt`**. README: same receipt/publish record shape can later hold an ABMT proposal package (Art 51.3(a)(ii)).

---

## 4. Roles & publishing language

Demo roles: **Party / NFP-linked submitter** · **Secretariat (authorised publishing role, demo)** · **Public** · **STB**.  

Avoid prescribing COP1 institutions. Prefer label **“Secretariat / authorised publishing role (demo)”** over “Publishing Authority”; if `publishing_authority` remains in the enum, caption it as **ABSCH analogue only**.

PrepCom-shaped taxonomy to seed: NFP admins · authenticated Party-linked submitters · registered non-State uploaders · public view-only (subset OK for day 1).

---

## 5. SIDS / low-bandwidth (preferential criterion)

First-class, not an afterthought:

- **Download offline submission template** (`.xlsx` / Word-shaped) with Zod-derived columns on MGR pre-collection  
- **Secretariat imports completed file** (stub pipeline OK)  
- `sourceChannel: form | excel | assisted` on records  
- Light pages; **no mandatory map**  
- Document a simple latency / payload budget in README  

---

## 6. Open-source & hands-on deliverables (preferential)

State explicitly in README / EOI form:

- **MIT** licence  
- Public **GitHub** repo + **Docker Compose** + seed data  
- **Seeded sandbox** URL  
- **Three demo logins** + **scripted 5–10 minute participant journey** (`DEMO-SCRIPT.md`)  

---

## 7. Engineering contracts (summary)

See `schemas/events.ts` for:

- Pack-level `draft|pending|published` (activity keeps `currentStage`)  
- Domain-discriminated events (`mgr|cbtmt|eia|abmt`)  
- `User` + role bindings; `Subscription` + `Notification` (not UI-copy-only)  
- `cbtmt_matches`; confidentiality tier + version + `sourceChannel` on records  
- TK / FPIC **metadata flag** (Art 13, metadata-first — no content store)  

Zod wording: the schema makes every field **explicit, validated, and traceable** to an Agreement requirement **or** a clearly labelled implementation field — not “impossible to invent fields.”

Stack freeze: Next.js App Router · Zod · shadcn · **better-sqlite3** · UUID only · append-only pack outbox.

### Non-goals (day 1)
Fork ABSCH · real SMTP/federation/Solr · full ABMT UI · ABS chain-of-custody · AI translation · neighbourhood as must-ship · inventing non-treaty objects.

---

## 8. Day sequencing

**Protect the demo:** rails + one MGR journey + one EIA publish/alert path by midday.  

Order: scaffold + users/roles + outbox → MGR journey (incl. `bSbi`) → EIA packs + STB queue + bell → CBTMT thin → stretch neighbourhood → polish.

Cut first if behind: neighbourhood · fancy mint sequence · inbox chrome · CBTMT match *rules* (keep seeded matches).

---

## 9. Success criteria

- Shared substrate visibly reused across MGR / EIA / CBTMT  
- Every **transition** maps to an Agreement duty (or labelled implementation field)  
- Role-dependent affordances enforced by schema, not only CSS  
- DOALOS gap is evident from README/slide/`/compare` content **without** live narration  
- Product-like, not a treaty PDF  
- Offline template + import stub present  
- MIT repo + sandbox + 3 logins + scripted journey documented  

---

## 10. Keepers
`KEEPERS.md`. Deep dive / Zotero `7R77ZJFH`.

## 11. Strategy note
See `STRATEGY-NOTE.md` for EOI timing / capacity (14 Sep cluster call, Ultra burn risk). Technical pack assumes a build; **pursuit is Glen’s call**.
