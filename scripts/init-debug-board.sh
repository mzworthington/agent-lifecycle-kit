#!/usr/bin/env bash
# Scaffold a hypothesis-driven debug board under ~/.agents/handover/<project>/.
# Usage:
#   init-debug-board.sh <project> [title]
#   init-debug-board.sh archlens "initial load layout overlap"
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="${REPO_DIR}/templates/debug-board.md"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <project> [title]" >&2
  exit 2
fi

PROJECT="$1"
TITLE="${2:-debug session}"
DATE="$(date -u +%Y-%m-%d)"
SAFE_TITLE="$(printf '%s' "${TITLE}" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
OUT_DIR="${REPO_DIR}/handover/${PROJECT}"
OUT_FILE="${OUT_DIR}/debug-board-${DATE}-${SAFE_TITLE}.md"

if [[ ! -f "${TEMPLATE}" ]]; then
  echo "ERROR: missing template at ${TEMPLATE}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

if [[ -e "${OUT_FILE}" ]]; then
  echo "ERROR: already exists: ${OUT_FILE}" >&2
  exit 1
fi

python3 - "$TEMPLATE" "$OUT_FILE" "$TITLE" "$PROJECT" "$DATE" <<'PY'
import pathlib, sys
template, out, title, project, date = sys.argv[1:]
text = pathlib.Path(template).read_text()
text = (
    text.replace("<short title>", title)
    .replace("<project-name>", project)
    .replace("YYYY-MM-DD", date)
)
pathlib.Path(out).write_text(text)
PY

HANDOVER="${OUT_DIR}/handover_debug.md"
if [[ ! -e "${HANDOVER}" ]]; then
  python3 - "$HANDOVER" "$PROJECT" "$DATE" "$OUT_FILE" <<'PY'
import pathlib, sys
handover, project, date, board = sys.argv[1:]
pathlib.Path(handover).write_text(
    f"""# Handover: debug

## Metadata

| Field | Value |
|-------|-------|
| **Phase** | debug |
| **Status** | BLOCKED |
| **Project** | `{project}` |
| **Next agent** | `agent-pre-commit` |
| **Date** | {date} |

## Summary

Debug in progress. Board: `{board}`.

## Deliverables

- Debug board (intake)

## Open questions / blockers

- Reproduce not yet proven

## Context for next agent

- See debug board for hypotheses and proof gates
"""
)
PY
fi

echo "Wrote ${OUT_FILE}"
echo "Handover: ${HANDOVER}"
