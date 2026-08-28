#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

export REPO_DIR="${REPO_DIR}"
node --import tsx/esm "${SCRIPT_DIR}/lib/run_evals.ts" "$@"
