# Demo script (5–10 minutes) — as built

Companion to `proposal/DEMO-SCRIPT.md` (the acceptance spec). Routes below are the ones that exist in v0.1.

## Before the demo

```bash
npm run db:reset      # fresh seeded database (dev only)
npm run smoke         # 20/20 expected
npm run dev           # http://localhost:3000
```

or `docker compose up --build` (seeds on first start; data persists in the `chm-data` volume).

## Sandbox logins — `/login`

| Login | Role | What they see |
|---|---|---|
| `party.nfp` | Party (demo Party XSD) | Own drafts and pending packs + everything published |
| `secretariat` | Authorised publishing role | Everything; full audit projection; import; matching |
| `public` | Public | Published, public-tier rows only |
| `stb` | STB reviewer | Published rows + restricted tier; review queue |

Cookie-based, no passwords. Any bad cookie = anonymous public.

## Journey

1. **Home `/`** — five rails with counts *filtered by your role*. Sign out and reload: counts shrink to the public view. Rails are the substrate; the journeys are just paths through it.

2. **MGR** (sign in as `party.nfp`)
   - `/mgr/new` — form generated from `FIELD_DEFS`; each field cites Art 12.2(a)–(j) or "implementation".
   - **Save draft** → batch page shows `internalId` only; receiptId, B-SBI and publicRecordId all *not yet issued*.
   - **Submit** on the same batch → `receiptId` + **B-SBI** appear, stage rail moves to `batch id issued`, pack chip `pre collection v1 · pending`. Still no publicRecordId.
   - Sign in as `secretariat` → **Publish pre collection v1** → `publicRecordId` `BBNJ-MGR-YYYY-NNNNN` appears; B-SBI unchanged. Bell for `party.nfp` gains a *publish* notification; `/audit` shows the row.
   - Optional: **Download offline template (.xlsx)** on `/mgr`, then `/mgr/import` → **Import sample fixture** (2 rows → 2 batches, `sourceChannel = excel`, each with its own B-SBI, pending).

3. **EIA**
   - `/eia` → *Sediment sampling, CCZ* (activity 2): published screening (`eia_required`), published notice, published draft EIA, pending decision. Publish the decision as `secretariat` → `party.nfp`, `public` (subscribed to CCZ) and `stb` are notified.
   - *Baseline survey, CCZ* (activity 3): published screening **and** a draft draft-EIA coexist — status lives on the pack, not the record. The public sees one activity with one published pack.
   - Sign in as `stb` → **STB queue** → activity 2's published draft EIA is waiting → record one consolidated comment → queue empties; a second comment on the same version is refused.
   - `/preferences` — subscription by domain / ABNJ box / theme.

4. **CBTMT** — `/capacity`: one need, one offer, one match row + `match_suggested` event. As `secretariat`, **Run shared-theme rule** (idempotent: 0 new). Post a need and an offer sharing a theme, publish both, run the rule again → one new match, one new event.

5. **ABMT** — greyed tab; `/abmt` says why (domain reserved in the locked contract, nothing stubbed).

6. **Audit `/audit`** — as `public`: published rows, actor *role* only. As `secretariat`: actor user, idempotency key, dispatch outcome.

7. **Close** — `/compare` (static DOALOS contrast).

## Things to say out loud

- "Status is a property of the pack, not the record."
- "The B-SBI is minted at valid receipt — before publication. Publish only adds the public record id."
- "Public and STB never see a draft or pending row; the same SQL policy governs lists, counts, audit, the resolver and the notification fan-out."
- "Every mutation carries an idempotency key; publish twice, submit twice, match twice — one row."
- "Seeds run through the same domain functions as the UI. `npm run smoke` proves the invariants on a throwaway database."

## Stretch (built)

Neighbourhood list on `/eia/[id]`: other visible activities in the same ABNJ box. No map.
