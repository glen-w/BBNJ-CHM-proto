# BBNJ Cl-HM prototype

**One shared substrate** (receipt → manage → publish/notify → roles) demoed through **MGR · EIA · CBTMT** journeys.

Repository: [github.com/glen-w/BBNJ-CHM-proto](https://github.com/glen-w/BBNJ-CHM-proto)

## Stack

- Next.js App Router · TypeScript · Zod · shadcn/ui
- better-sqlite3 (seeded SQLite, no ORM)
- Docker Compose for local/production-like runs
- MIT licence · sandbox logins (see below)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health).

### Docker

```bash
docker compose up --build
```

SQLite data persists in the `chm-data` volume.

## Sandbox logins (target)

| Username | Role |
|---|---|
| `party.nfp` | Party / NFP-linked submitter |
| `secretariat` | Authorised publishing role (demo) |
| `public` | View published packs only (switch to **stb** for draft-EIA review queue) |

## Why this prototype (DOALOS contrast)

Interim DOALOS Cl-HM is largely **static / informational**. This build is **transactional**: structured intake, role-gated publish, Art 12 **B-SBI** on valid pre-collection receipt, pack-level EIA publications, subscriptions/digests, CBTMT match rows, append-only audit outbox.

See `/compare` or `proposal/DEMO-SCRIPT.md` for the required slide.

## Project layout

| Path | Purpose |
|---|---|
| `src/app/` | App Router pages and API routes |
| `src/schemas/events.ts` | Locked Zod contracts |
| `src/lib/db/` | SQLite schema + connection |
| `proposal/` | Planning pack (PROPOSAL, demo script, agent prompt) |
| `context/` | Briefing notes (not shipped in the app) |

## Planning pack

| File | Purpose |
|---|---|
| `proposal/PROPOSAL.md` | Product + EOI framing |
| `proposal/PLANNING-AGENT-PROMPT.md` | Locked build contract |
| `proposal/schemas/events.ts` | Source copy of Zod contracts |
| `proposal/DEMO-SCRIPT.md` | 5–10 min journey + DOALOS slide |
| `proposal/KEEPERS.md` | OSS pattern keepers |

## Development status

Scaffold is in place: routes, schema, database layer, Docker, and journey placeholders. Next implementation steps follow `proposal/PLANNING-AGENT-PROMPT.md` sections A–I.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # start production server
npm run lint     # ESLint
```
