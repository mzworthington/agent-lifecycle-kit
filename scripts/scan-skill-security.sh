#!/usr/bin/env bash
# Audit skills for prompt injection, secret exfiltration risks, and unapproved external repositories
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_DIR

node --import tsx/esm "${REPO_DIR}/scripts/lib/scan_skill_security.ts"
