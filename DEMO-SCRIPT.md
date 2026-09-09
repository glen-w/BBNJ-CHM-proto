# Demo script (10 minutes) — as built, v0.2

Companion to `proposal/DEMO-SCRIPT.md` (the acceptance spec). Routes below exist in v0.2. The same journey runs unattended as `npm run demo`, so every claim below is asserted, not hoped for.

## Before the demo

```bash
npm run db:reset      # fresh seeded database, schema v4 (dev only)
npm run smoke         # 27/27 expected
SANDBOX_RESET=1 npm run dev     # http://localhost:3000 — the env var shows the Secretariat's Reset database button
```

or `docker compose up --build` (seeds on first start; `docker compose down -v` if you have a v0.1 volume).

Optional dry run against the live server: `BASE_URL=http://localhost:3000 npm run demo`.

## Sign in — `/login`

| Login | Role | What they see |
|---|---|---|
| `party.nfp` | Party (demo Party XSD), digest **daily** | Own drafts and pending packs + everything published; own refusals are logged but not shown |
| `secretariat` | Authorised publishing role | Everything; full audit projection incl. refusal log, import runs, digest windows; import; matching; digest; reset |
| `public` | Public, digest **immediate** (EIA, CCZ) | Published, public-tier rows only |
| `stb` | STB reviewer, digest **daily** (EIA) | Published rows + restricted tier; review queue |

Cookie-based, no passwords. Any bad cookie = anonymous public.

## Journey (≈ 1 minute per step)

1. **Home `/`** as the anonymous public — five rails with counts filtered by role: 0 pending packs, no notifications. The *Export CSV* button downloads exactly the rows the public can see. Say: "counts, lists, exports and notifications all go through one SQL visibility clause".

2. **MGR receipt** (sign in as `party.nfp`) — `/mgr/new` → **Save draft** → batch page shows `internalId` only → **Submit** → `receiptId` + **B-SBI** appear, still no `publicRecordId`. Say: "the B-SBI is minted at valid receipt, before publication".

3. **Refusal** — still as `party.nfp`, type `/mgr/import` into the address bar (no button leads there for a Party): *Import is a Secretariat function … This visit was recorded in the refusal log.* Sign in as `secretariat` → `/audit` → **Refusal log** shows the row (actor role and user, action `import`, path, reason). Say: "buttons are hidden by role, but hiding is not enforcement — the server refuses and every refusal is an append-only row; the public projection never shows it". (The unattended demo also exercises a Party calling publish directly.)

4. **Publish + notify** — as `secretariat`, publish the batch from step 2 → `publicRecordId` `BBNJ-MGR-YYYY-NNNNN` appears; B-SBI unchanged. Sign in as `party.nfp` → bell has one *publish* row. Open `/records/<publicRecordId>` — the stable URL resolves; `/api/records/<id>.json` and `.pdf` open.

5. **Versioning** — as `secretariat`, on DEMO-01 the **Version history** shows *post collection v1 published (current — v2 pending)* and *v2 pending material* with its change note. **Publish post collection v2** → history flips to *v1 (superseded)*, *v2 published material*; `party.nfp` (who was told about v1) gets *amended v2 (material change)* in the bell. Then, as `party.nfp`, use **Amend a published pack** on *pre collection* with a change note (tick *Also edit Art 12.2 fields* to change the area) → pending v2; the superseded values appear under *Superseded Art 12.2 values* for the Secretariat. Say: "identifiers never change across versions; a material change re-notifies everyone who heard about the earlier version".

6. **Offline / SIDS loop** — as `secretariat`, `/mgr/import` → **Import sample (2 valid + 1 invalid)** → run page: two rows *accepted → pending* with their own B-SBIs, one *rejected* with field-level errors and the received values. **Download error report (.xlsx)** → open it: the Data sheet holds only the failed row plus an *Error* column. (In the unattended demo the row is corrected and re-imported: 1 accepted.) The run also appears under *Import runs* on `/audit`.

7. **Confidentiality** — `/mgr` as `secretariat` shows *Confidential cruise DEMO-05* (confidential) and *Restricted survey DEMO-04*. Sign in as `stb`: the restricted batch is visible, the confidential one is gone; as `public`: neither. Each record page carries a one-line *Who can see this* statement; `/api/records/<restricted id>.json` is a 404 for the public and logs a refusal. `/eia` has a restricted activity too.

8. **EIA + STB** — `/eia` → *Sediment sampling, CCZ*: published screening, notice, draft EIA, pending decision. Sign in as `stb` → **STB queue** → one consolidated comment → queue empties; a second comment on the same version is refused (and logged). *Baseline survey, CCZ* shows a published screening coexisting with a draft draft-EIA.

9. **Digest** — as `secretariat`, `/notifications` → **Run digest now**. The flash names who received a digest (e.g. `stb (N)`); run again → "nothing new held". Sign in as `stb` → the bell has one *digest* row summarising the held EIA publications; the per-event rows it would have had under *immediate* are absent. `/audit` → *Digest windows delivered*.

10. **CBTMT + close** — `/capacity`: one need, one offer, one match row + `match_suggested` event; **Run shared-theme rule** is idempotent (0 new). Then open `/compare` by URL (not in the shell nav): the three Session‑1 functions, every row linking back into what you just did. Finally, as `secretariat` with `SANDBOX_RESET=1`, **Reset database** on `/audit` → home again with fresh seeds.

## Things to say out loud

- "Status is a property of the pack, not the record."
- "The B-SBI is minted at valid receipt — before publication. Publish only adds the public record id. Neither ever changes across versions."
- "Public and STB never see a draft or pending row; the same SQL policy governs lists, counts, audit, the resolver, exports and the notification fan-out."
- "Every mutation carries an idempotency key; publish twice, submit twice, import twice, match twice, run the digest twice — one row."
- "Every refusal is a row. If the Secretariat cannot see who was refused what, the audit is not complete."
- "Seeds run through the same domain functions as the UI. `npm run smoke` proves the invariants; `npm run demo` proves this script."
- "Header languages open the official BBNJ text in a new tab; the UI stays English — no machine translation. The calm banner shows which treaty-text locale you picked (Arabic RTL on that banner only)."
- "On a pack page, § Agreement basis lists only the articles for that record’s domain and stages. The sticky audit ribbon is the latest outbox event your role can see — it moves when you switch role or publish."

## Stretch (built)

Neighbourhood list on `/eia/[id]`: other visible activities in the same ABNJ box. No map. TK/FPIC flag badge on MGR batches (metadata only).
