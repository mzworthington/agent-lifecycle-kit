#!/usr/bin/env bash
# Install or update official/third-party skills declared in skills/external.lock.json
# via `gh skill` (Cursor user scope). Kit-authored skills stay in skills/; these do not.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="${REPO_DIR}/skills/external.lock.json"
MODE="install"
DRY_RUN=0
FORCE=0

usage() {
  cat <<'EOF'
Usage: sync-external-skills.sh [--install|--update|--dry-run] [--force]

  --install   Install skills from skills/external.lock.json (default)
  --update    Run `gh skill update` for installed skills (unpinned)
  --dry-run   Report actions without changing files
  --force     Pass --force to gh skill install (overwrite local copies)

Skills install to Cursor user scope (~/.cursor/skills) so they stay outside
this kit's git tree. Upgrade path: edit the lockfile, re-run --install, or
run --update to pull upstream changes for already-installed skills.

Requires: gh CLI v2.90+ with `gh skill` (preview).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --install)
      MODE="install"
      shift
      ;;
    --update)
      MODE="update"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    *)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is required (https://cli.github.com/)" >&2
  exit 1
fi

if ! gh skill --help >/dev/null 2>&1; then
  echo "ERROR: gh skill is unavailable. Upgrade GitHub CLI to v2.90+." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to read ${LOCK_FILE}" >&2
  exit 1
fi

if [[ ! -f "${LOCK_FILE}" ]]; then
  echo "ERROR: lockfile not found: ${LOCK_FILE}" >&2
  exit 1
fi

ENTRIES=()
while IFS= read -r line; do
  [[ -n "${line}" ]] && ENTRIES+=("${line}")
done < <(LOCK_FILE="${LOCK_FILE}" node "${REPO_DIR}/scripts/lib/parse_external_lock.ts")

if [[ ${#ENTRIES[@]} -eq 0 ]]; then
  echo "No skills declared in ${LOCK_FILE}"
  exit 0
fi

parse_entry() {
  # sets: REPO SKILL PIN AGENT SCOPE ID
  local line="$1"
  REPO="${line%%|*}"
  local rest="${line#*|}"
  SKILL="${rest%%|*}"
  rest="${rest#*|}"
  PIN="${rest%%|*}"
  rest="${rest#*|}"
  AGENT="${rest%%|*}"
  rest="${rest#*|}"
  SCOPE="${rest%%|*}"
  ID="${rest#*|}"
}

install_one() {
  local repo="$1" skill="$2" pin="$3" agent="$4" scope="$5" id="$6"
  local -a cmd=(gh skill install "${repo}" "${skill}" --agent "${agent}" --scope "${scope}")
  if [[ -n "${pin}" ]]; then
    cmd+=(--pin "${pin}")
  fi
  if [[ "${FORCE}" -eq 1 ]]; then
    cmd+=(--force)
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "DRY-RUN: ${cmd[*]}"
    return 0
  fi

  echo "Installing ${id} from ${repo} (${skill})"
  "${cmd[@]}"
}

update_all() {
  local -a names=()
  local line
  for line in "${ENTRIES[@]}"; do
    parse_entry "${line}"
    names+=("${ID}")
  done

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "DRY-RUN: gh skill update --dry-run ${names[*]}"
    gh skill update --dry-run "${names[@]}" || true
    return 0
  fi

  echo "Updating: ${names[*]}"
  gh skill update --all
}

case "${MODE}" in
  install)
    for line in "${ENTRIES[@]}"; do
      parse_entry "${line}"
      install_one "${REPO}" "${SKILL}" "${PIN}" "${AGENT}" "${SCOPE}" "${ID}"
    done
    echo ""
    echo "OK: external skills synced from ${LOCK_FILE}"
    echo "Upgrade later with: ./scripts/sync-external-skills.sh --update"
    ;;
  update)
    update_all
    echo ""
    echo "OK: external skill update pass complete"
    ;;
esac
