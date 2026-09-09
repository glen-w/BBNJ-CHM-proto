# BBNJ Cl-HM day prototype

**One shared substrate** (receipt → manage → publish/notify → roles) demoed through **MGR · EIA · CBTMT** journeys.

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

**Licence:** MIT · public GitHub · seeded SQLite · three demo roles.

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
