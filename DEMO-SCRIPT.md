# Demo script (10 minutes) — as built, EOI wave (schema v5)

Companion to `proposal/DEMO-SCRIPT.md` (the acceptance spec). Routes below exist in this build. The same journey runs unattended as `npm run demo` (17 narrated checkpoints), so every claim below is asserted, not hoped for. Where the two diverge, the *Alignment with `npm run demo`* notes say so.

Honesty rules for the presenter: notifications are **in-app only** (no e-mail); Art 51.5 is shown as an **offline Excel pattern**, not a WCAG certification; ABMT is a **thin stub without prejudice**; there is **no hosted public URL** — participants run the clone or the Docker image (C1 public hosting is out of scope).

## Before the demo

```bash
npm run db:reset      # fresh seeded database, schema v5 (dev only)
npm run smoke         # 35 tests expected to pass (two may report `skip` if an optional API is absent)
SANDBOX_RESET=1 npm run dev     # http://localhost:3000 — the env var shows the Secretariat's Reset database button
```

or `docker compose up --build` (seeds on first start; `docker compose down -v` if you have a v4 or older volume).

Optional dry run against the live server: `BASE_URL=http://localhost:3000 npm run demo`.

## Sign in — `/login` (five logins)

| Login | Role | What they see / may do |
|---|---|---|
| `party.nfp` | Party (demo Party XSD), digest **daily** | Own drafts and pending packs + everything published; submits MGR, EIA, CBTMT needs, ABMT stubs; own refusals are logged but not shown |
| `secretariat` | Authorised publishing role | Everything; full audit projection incl. refusal log, import runs, digest windows; MGR + EIA screening import; matching + facilitation notes; digest run + digest CSV; reset |
| `public` | Public, digest **immediate** (EIA, CCZ) | Published, public-tier rows only |
| `stb` | STB reviewer, digest **daily** (EIA) | Published rows + restricted tier; review queue |
| `nonstate.uploader` | Registered non-State uploader | Published, public-tier rows; may post **CBTMT offers only** |

Cookie-based, no passwords. Any bad cookie = anonymous public.

## Journey (≈ 1 minute per step)

1. **Home `/`** as the anonymous public — rails with counts filtered by role: 0 pending packs, no notifications. The *Export CSV* button downloads exactly the rows the public can see. Scroll to the footer: **Related systems** links to existing clearing-houses and data systems — say: "an early interoperability seam: named links, not federation". Say: "counts, lists, exports and notifications all go through one SQL visibility clause". Honesty caption on the home: *Plausible demo data; not real Party filings.*

1b. **Rich seed beat (optional, ~90 s)** — open `/mgr` and find **Interim (DOALOS)** badge on *BBNJ-MGR-TEMP-2026-001 (mirrored)* → open it: DMP / artefact URL points at the live DOALOS TEMP page; B-SBI and `publicRecordId` are real Cl-HM ids (never equal to the TEMP label). Then `/eia` → **Demo scenario** badges on rocket splashdown (draft published), mCDR/OAE (draft pending), and mesopelagic fishery (screening only) — open mesopelagic → **§ Agreement basis** cites Zotero `6K6WPBFQ` as RFMO-gap / Part IV framing. `/abmt` → published *Sargasso Sea Core* stub; open *CCZ … precautionary* for the ISA not-undermine caption. `/capacity` → extra needs/offers and facilitation notes. Say: "list badges separate Interim (DOALOS) mirrors from Demo scenarios so rocket/mCDR/mesopelagic are never read as filed notifications."

2. **MGR receipt** (sign in as `party.nfp`) — `/mgr/new` → **Save draft** → batch page shows `internalId` only → **Submit** → `receiptId` + **B-SBI** appear, still no `publicRecordId`. Say: "the B-SBI is minted at valid receipt, before publication".

3. **Refusals, two kinds** — still as `party.nfp`, type `/mgr/import` into the address bar: *Import is a Secretariat function … This visit was recorded in the refusal log.* Then sign in as `nonstate.uploader`: `/capacity` → **Post an offer** works (pending, `actorRole = non_state_uploader`); now try `/mgr/new` and `/mgr/import` — both refused with *non-State uploader may post CBTMT offers only*. Sign in as `secretariat` → `/audit` → **Refusal log** shows each row (actor role and user, action, path, reason). Say: "buttons are hidden by role, but hiding is not enforcement — the server refuses and every refusal is an append-only row; the public projection never shows it". (The unattended demo also exercises a Party calling publish directly and the uploader calling publish and import.)

4. **Publish + notify (in-app)** — as `secretariat`, publish the batch from step 2 → `publicRecordId` `BBNJ-MGR-YYYY-NNNNN` appears; B-SBI unchanged. Sign in as `party.nfp` → the bell has one *publish* row. Say plainly: "notifications are in-app only in this build — bell and `/notifications`; there is no e-mail. The Secretariat can export delivered digest windows as CSV, which is a file, not a channel." Open `/records/<publicRecordId>` — the stable URL resolves; `/api/records/<id>.json` and `.pdf` open.

5. **Versioning** — as `secretariat`, on DEMO-01 the **Version history** shows *post collection v1 published (current — v2 pending)* and *v2 pending material* with its change note. **Publish post collection v2** → history flips to *v1 (superseded)*, *v2 published material*; `party.nfp` (who was told about v1) gets *amended v2 (material change)* in the bell. Then, as `party.nfp`, **Amend a published pack** on *pre collection* with a change note (tick *Also edit Art 12.2 fields*) → pending v2; superseded values appear under *Superseded Art 12.2 values* for the Secretariat. Say: "identifiers never change across versions; a material change re-notifies everyone who heard about the earlier version".

6. **Offline / SIDS loop — Art 51.5 as a pattern** — as `secretariat`, `/mgr/import` → **Import sample (2 valid + 1 invalid)** → run page: two rows *accepted → pending* with their own B-SBIs, one *rejected* with field-level errors and the received values. **Download error report (.xlsx)** → the Data sheet holds only the failed row plus an *Error* column. Then the same loop for **EIA screening**: download `/api/template/eia-screening.xlsx`, import the EIA sample — accepted rows become activities with a pending screening pack that already carries its Art 31 outcome. Say: "this is the low-bandwidth, assisted-access pattern the Agreement asks for in Art 51.5 — demonstrated, not certified; `ACCESSIBILITY.md` is the gap analysis". (In the unattended demo the MGR row is corrected and re-imported: 1 accepted.) Runs appear under *Import runs* on `/audit`.

7. **Confidentiality + TK/FPIC** — `/mgr` as `secretariat` shows *Confidential cruise DEMO-05* (confidential, TK/FPIC badge) and *Restricted survey DEMO-04*. Open DEMO-05: the **Traditional knowledge / FPIC** panel shows provenance and FPIC status captions (metadata only — the knowledge itself is never stored). Sign in as `stb`: the restricted batch is visible, the confidential one is gone; as `public`: neither. Each record page carries a one-line *Who can see this* statement (and notes that a separate proprietary category is deferred); `/api/records/<restricted id>.json` is a 404 for the public and logs a refusal. `/eia` has a restricted activity too.

8. **EIA artifacts + STB** — `/eia` → *Sediment sampling, CCZ*: published screening, notice, draft EIA, pending decision; the published packs list **artifacts** (PDF / URL / note references — references, not a file store). Sign in as `stb` → **STB queue** → one consolidated comment → queue empties; a second comment on the same version is refused (and logged). *Baseline survey, CCZ* shows a published screening coexisting with a draft draft-EIA. Note the **neighbourhood** list (same ABNJ box) — a list, not a map.

9. **ABMT stub + digest** — as `party.nfp`, `/abmt` → **New proposal stub** → **Submit** (receipt id, no public id) → as `secretariat`, **Publish** → `BBNJ-ABMT-YYYY-NNNNN`. Say: "same rails, same identifiers, same audit; a stub without prejudice to what COP1 decides about area-based management tools — the tab is quiet and the data is clearly a stub". Then `/notifications` → **Run digest now**. The flash names who received a digest (e.g. `stb (N)`); run again → "nothing new held". Sign in as `stb` → one *digest* row summarising the held EIA publications. `/audit` → *Digest windows delivered*; **Export digests (.csv)** for the Secretariat.

10. **CBTMT facilitation + close** — `/capacity`: one need, one offer (plus the uploader's offer from step 3), one match row + `match_suggested` event; the seeded match carries a **facilitation note** from the Secretariat (human brokerage — "we introduced both focal points"); edit it as `secretariat`; **Run shared-theme rule** is idempotent (0 new). Then open `/compare` by URL (not in the shell nav): the three Session‑1 functions, every row linking back into what you just did. Say: "the left column describes the interim DOALOS pages as we understand them from public materials — an appropriate interim posture, and a design contrast rather than a critique". Finally, as `secretariat` with `SANDBOX_RESET=1`, **Reset database** on `/audit` → home again with fresh seeds.

## Alignment with `npm run demo`

`scripts/demo.ts` runs on its own temp database and asserts, in order: seed → public rails → MGR draft/receipt → Party publish refused → Secretariat publish + owner bell → MGR import loop (2+1, error workbook, corrected re-import) → STB comment → seeded v2 material publish → shared-theme matching (idempotent) → digest run (second run inserts 0) → exports/tiers → **facilitation note (no new event; Party refused)** → **non-State uploader (offer accepted; MGR draft, publish, import refused = 3 rows)** → **ABMT stub (draft → pending → `BBNJ-ABMT-`)** → **EIA artifacts (seed count + new pack with two refs)** → reconcile/replay → reset. With `BASE_URL` it also checks `/`, `/compare`, `/audit`, `/mgr/import`, `/notifications`, `/capacity`, `/cbtmt` (redirect), `/abmt`, exports, record JSON/PDF, restricted 404, `/api/health`.

Differences from the live script, on purpose: the unattended run uses the MGR import fixture only (the EIA screening import is asserted in `npm run smoke`, not in the demo); it does not open `/compare` or the digest CSV; and if the seed does not yet carry the fifth login it substitutes a temp-DB uploader and says so in the checkpoint title.

## Things to say out loud

- "Status is a property of the pack, not the record."
- "The B-SBI is minted at valid receipt — before publication. Publish only adds the public record id. Neither ever changes across versions."
- "Public and STB never see a draft or pending row; the same SQL policy governs lists, counts, audit, the resolver, exports and the notification fan-out."
- "Every mutation carries an idempotency key; publish twice, submit twice, import twice, match twice, run the digest twice — one row."
- "Every refusal is a row. If the Secretariat cannot see who was refused what, the audit is not complete."
- "Notifications are in-app. We did not build e-mail; we built the semantics that any channel would need — hold, digest, re-notify."
- "Art 51.5 here is a pattern — the offline Excel loop — not a certification."
- "ABMT is a stub without prejudice. It proves the rails carry a fourth domain; it does not pretend to know what COP1 will decide."
- "Seeds run through the same domain functions as the UI. `npm run smoke` proves the invariants; `npm run demo` proves this script."
- "Header languages open the official BBNJ text in a new tab; the UI stays English — no machine translation. The calm banner shows which treaty-text locale you picked (Arabic RTL on that banner only)."
- "On a pack page, § Agreement basis lists only the articles for that record's domain and stages. The sticky audit ribbon is the latest outbox event your role can see — it moves when you switch role or publish."

## Stretch (built)

Neighbourhood list on `/eia/[id]`: other visible activities in the same ABNJ box. No map. TK/FPIC on MGR: flag badge plus provenance / FPIC status captions on DEMO-05 (metadata only — no content store). Explicit EIA `dueAt` on an activity overrides the demo 30‑day deadline in digest text. `/cbtmt` redirects to `/capacity`.
