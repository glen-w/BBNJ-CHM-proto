# Project card — BBNJ Cl-HM

Single place to edit token values. Slash commands under `.cursor/commands/` stay self-contained (values are inlined).

```yaml
project: BBNJ Cl-HM
package: bbnj-chm-proto
src_package: src
ui_kind: next                 # not streamlit — /streamlit skipped
ui_port: 3000
ui_entry: npm run dev
sibling_ports: []             # none documented; confirm before killing non-3000 ports
small_fixture: npm run db:seed -- --if-empty; npm run contracts:check && npm run smoke
large_fixture_hint: seeded SQLite with full MGR + EIA + CBTMT journeys, or a path the user names
default_test_cmd: npm run typecheck && npm run lint && npm run contracts:check && npm test && npm run smoke
coverage_cmd: npx vitest run --coverage
architecture_rules:
  - one shared Cl-HM substrate (receipt → manage → publish/notify → roles)
  - Zod in proposal/schemas/events.ts authoritative; byte-identical copy at src/lib/contracts/events.ts
  - Lock 1 pack status vs activity stage
  - Lock 2 STB never sees draft/pending packs
  - Lock 3 internalId / publicRecordId / bSbi
  - Lock 4 CBTMT match is a row + outbox
  - better-sqlite3 only; no Drizzle/Kafka
release_governance: none
backup_hub: sibling
backup_excludes:
  - data
  - .next
  - coverage
  - out
  - .vercel
backup_includes:
  - proposal/***
  - context/***
  - public/***
  - package.json
  - package-lock.json
  - .npmrc
  - .nvmrc
  - tsconfig.json
  - next.config.ts
  - components.json
  - eslint.config.mjs
  - postcss.config.mjs
  - "*.ts"
  - "*.tsx"
  - "*.mjs"
  - "*.css"
verify_paths:
  - src
  - scripts
  - package.json
  - docker-compose.yml
  - Dockerfile
  - proposal
  - .cursor/commands
staging_prefix: chm-backup
high_leverage_tests:
  - Zod contract parity
  - pack publish vs activity stage
  - B-SBI minting
  - STB visibility
  - CBTMT match + outbox
  - smoke/health
  - seed idempotency
probe_small: db:check/seed + contracts:check + smoke + /api/health
probe_large: docker compose up --build; MGR receipt→publish and EIA draft_eia
probe_extra: replay-outbox; journey routes on :3000; npm run build
doc_contracts:
  - README.md
  - SHIPPED-VS-DEFERRED.md
  - DEMO-SCRIPT.md
  - proposal/schemas/events.ts
  - src/lib/contracts/events.ts
  - CONTRACT-AMENDMENTS.md
  - proposal/PLANNING-AGENT-PROMPT.md
  - proposal/PROPOSAL.md
compose_service: app
```
