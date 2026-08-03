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

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required to compose mcp.json" >&2
  exit 1
fi

COMPOSED="$(
  PROFILE_PATH="${PROFILE_PATH}" MCPS_DIR="${MCPS_DIR}" python3 <<'PY'
import json
import os
import sys
from pathlib import Path

profile_path = Path(os.environ["PROFILE_PATH"])
mcps_dir = Path(os.environ["MCPS_DIR"])
profile = json.loads(profile_path.read_text())
server_ids = profile.get("servers") or []
if not isinstance(server_ids, list):
    print("ERROR: profile.servers must be a list", file=sys.stderr)
    sys.exit(1)

mcp_servers = {}
missing_env = []
for server_id in server_ids:
    server_file = mcps_dir / "servers" / server_id / "server.json"
    if not server_file.is_file():
        print(f"ERROR: server definition missing: {server_file}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(server_file.read_text())
    fragment = data.get("mcp")
    if not isinstance(fragment, dict) or not fragment:
        print(f"ERROR: {server_file} must contain a non-empty mcp object", file=sys.stderr)
        sys.exit(1)
    for key, value in fragment.items():
        if key in mcp_servers:
            print(f"ERROR: duplicate mcpServers key '{key}' from {server_id}", file=sys.stderr)
            sys.exit(1)
        mcp_servers[key] = value
    for env_name in data.get("requiredEnv") or []:
        if not os.environ.get(env_name):
            missing_env.append(f"{server_id}:{env_name}")

if missing_env:
    print(
        "WARN: required env vars not set in this shell (Cursor may still resolve them): "
        + ", ".join(missing_env),
        file=sys.stderr,
    )

print(json.dumps({"mcpServers": mcp_servers}, indent=2))
print(file=sys.stderr)
print(
    f"OK: composed profile '{profile.get('name', profile_path.stem)}' "
    f"with {len(mcp_servers)} server(s)",
    file=sys.stderr,
)
PY
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
