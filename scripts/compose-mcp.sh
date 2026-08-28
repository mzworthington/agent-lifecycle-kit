#!/usr/bin/env bash
# Compose a Cursor mcp.json from mcps/profiles/<name>.json + servers/*/server.json
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCPS_DIR="${REPO_DIR}/mcps"
PROFILE=""
OUTPUT=""
INSTALL=0

usage() {
  cat <<'EOF'
Usage: compose-mcp.sh <profile> [--install] [-o <path>]

  <profile>     Profile name under mcps/profiles/ (without .json)
  --install     Write to ~/.cursor/mcp.json (creates backup if file exists)
  -o <path>     Write composed JSON to this path instead of stdout

Examples:
  ./scripts/compose-mcp.sh default
  ./scripts/compose-mcp.sh default --install
  ./scripts/compose-mcp.sh project-example -o .cursor/mcp.json
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --install)
      INSTALL=1
      shift
      ;;
    -o)
      OUTPUT="${2:-}"
      if [[ -z "${OUTPUT}" ]]; then
        echo "ERROR: -o requires a path" >&2
        exit 1
      fi
      shift 2
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "${PROFILE}" ]]; then
        echo "ERROR: unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      PROFILE="$1"
      shift
      ;;
  esac
done

if [[ -z "${PROFILE}" ]]; then
  echo "ERROR: profile name is required" >&2
  usage >&2
  exit 1
fi

PROFILE_PATH="${MCPS_DIR}/profiles/${PROFILE}.json"
if [[ ! -f "${PROFILE_PATH}" ]]; then
  echo "ERROR: profile not found: ${PROFILE_PATH}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to compose mcp.json" >&2
  exit 1
fi

COMPOSED="$(
  PROFILE_PATH="${PROFILE_PATH}" MCPS_DIR="${MCPS_DIR}" node "${REPO_DIR}/scripts/lib/compose_mcp.ts"
)"

write_target() {
  local target="$1"
  local dir
  dir="$(dirname "${target}")"
  mkdir -p "${dir}"
  if [[ -f "${target}" ]]; then
    local backup="${target}.bak.$(date +%Y%m%d%H%M%S)"
    cp "${target}" "${backup}"
    echo "Backed up existing ${target} -> ${backup}" >&2
  fi
  printf '%s\n' "${COMPOSED}" > "${target}"
  echo "Wrote ${target}" >&2
}

if [[ "${INSTALL}" -eq 1 ]]; then
  write_target "${HOME}/.cursor/mcp.json"
elif [[ -n "${OUTPUT}" ]]; then
  write_target "${OUTPUT}"
else
  printf '%s\n' "${COMPOSED}"
fi
