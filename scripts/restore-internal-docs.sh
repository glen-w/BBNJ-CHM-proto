#!/usr/bin/env bash
# Re-populate internal/ planning archive (gitignored) from git history.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SOURCE_REF="${1:-HEAD}"
ARCHIVE="internal"

FILES=(
  IMPLEMENTATION-PLAN.md
  SHIPPED-VS-DEFERRED.md
  HARDENING.md
  CONTRACT-AMENDMENTS.md
  context/BRIEFING-CHM-deepdive.md
  proposal/README.md
  proposal/DEMO-SCRIPT.md
  proposal/KEEPERS.md
  proposal/PLANNING-AGENT-PROMPT.md
  proposal/PROPOSAL.md
  proposal/schemas/events.ts
  proposal/old/PROPOSAL.md
  proposal/old/schemas/events.ts
)

mkdir -p "$ARCHIVE/context" "$ARCHIVE/proposal/schemas" "$ARCHIVE/proposal/old/schemas"

restored=0
missing=0
for f in "${FILES[@]}"; do
  dest="$ARCHIVE/$f"
  if git show "$SOURCE_REF:$f" >"$dest" 2>/dev/null; then
    echo "  $dest"
    restored=$((restored + 1))
  else
    echo "  skip (not in $SOURCE_REF): $f" >&2
    missing=$((missing + 1))
  fi
done

cat >"$ARCHIVE/README.md" <<'EOF'
# Internal planning archive (gitignored)

Planning, EOI checklists, contract-amendment notes and the original `proposal/` pack. **Not part of the product** — kept locally for future development and presenter prep.

The public repo documents the running desk in the root `README.md`, `DEMO-SCRIPT.md`, `VISUAL-CHARTER.md` and `ACCESSIBILITY.md`.

## Layout

| Path | What it is |
|---|---|
| `IMPLEMENTATION-PLAN.md` | Original architecture / build plan (parts outdated) |
| `SHIPPED-VS-DEFERRED.md` | Session‑1 / EOI scope checklist |
| `HARDENING.md` | P0 hardening ledger |
| `CONTRACT-AMENDMENTS.md` | Contract fold notes (C9 applied in app) |
| `context/BRIEFING-CHM-deepdive.md` | Background briefing |
| `proposal/` | Locked contract pack, planning prompts, old proposals |
| `proposal/schemas/events.ts` | Historical duplicate of `src/lib/contracts/events.ts` (app copy is authoritative) |

## Restore after a fresh clone

```bash
npm run internal:restore
```

## Do not

- Link to these files from product chrome or the public README planning table.
- Treat `proposal/schemas/events.ts` as authoritative — `src/lib/contracts/events.ts` is the single contract source.
EOF

echo ""
echo "Restored $restored file(s) under $ARCHIVE/ from $SOURCE_REF ($missing missing)."
if [[ $missing -gt 0 ]]; then
  echo "Try an older ref: bash scripts/restore-internal-docs.sh <commit-before-cleanup>"
  exit 1
fi
