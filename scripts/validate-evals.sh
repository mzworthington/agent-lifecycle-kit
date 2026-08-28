#!/usr/bin/env bash
# Validate eval suite JSON files from both evals/suites/ and co-located skills/*/evals/
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_DIR

echo "=== Agent Lifecycle Kit - Skill Evals Validation ==="
echo ""

node "${REPO_DIR}/scripts/lib/validate_evals.ts"
