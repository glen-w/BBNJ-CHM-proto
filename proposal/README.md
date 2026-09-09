# BBNJ Cl-HM day prototype

> **EOI pack (proposal/).** Planning and lock artefacts for the day build. **Running product docs live at the repo root:** [`README.md`](../README.md), [`DEMO-SCRIPT.md`](../DEMO-SCRIPT.md), [`SHIPPED-VS-DEFERRED.md`](../SHIPPED-VS-DEFERRED.md). Live schema is **v5**; five demo logins including `nonstate.uploader`; ABMT is a thin enabled stub.

**One shared substrate** (receipt → manage → publish/notify → roles) demoed through **MGR · EIA · CBTMT** journeys (plus a thin ABMT stub).

## Why this prototype (DOALOS contrast)

Interim DOALOS Cl-HM is largely **static / informational**. This prototype is **transactional**: structured intake, role-gated publish, Art 12 **B‑SBI** on valid pre-collection receipt, pack-level EIA publications, subscriptions/digests, CBTMT match rows, append-only audit outbox.

| Interim (illustrative) | This build |
|---|---|
| No B‑SBI | `bSbi` at valid pre-collection receipt |
| Weak RBAC / publish | Party submit → Secretariat publish |
| No deadline / subscription alerts | Bell + preferences drawer |
| Thin capacity matchmaking | `cbtmt_matches` |
| No pack-level EIA spine | Coexisting published packs |

Full slide text: `DEMO-SCRIPT.md`. Optional static page: `/compare` (content only — not app chrome).

## Run (target)

```bash
# after scaffold
docker compose up
# sandbox logins — see DEMO-SCRIPT.md
```

**Licence:** MIT · public GitHub · seeded SQLite · five demo logins (see root `DEMO-SCRIPT.md`).

## Pack contents

| File | Purpose |
|---|---|
| `PROPOSAL.md` | Product + EOI framing |
| `PLANNING-AGENT-PROMPT.md` | Locked build contract for a planning agent |
| `schemas/events.ts` | Zod contracts |
| `DEMO-SCRIPT.md` | 5–10 min journey + DOALOS slide |
| `KEEPERS.md` | OSS pattern keepers |
| `STRATEGY-NOTE.md` | Timing / capacity (non-technical) |

## SIDS / offline

MGR: **Download template** → fill offline → **Secretariat import** stub. `sourceChannel: form|excel|assisted`. No mandatory map.
