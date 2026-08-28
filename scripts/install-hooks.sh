#!/usr/bin/env bash
# Install local Git pre-commit hook to execute security, skill layout, and evals validation before commits.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_FILE="${REPO_DIR}/.git/hooks/pre-commit"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "ERROR: .git directory missing at ${REPO_DIR}/.git" >&2
  exit 1
fi

mkdir -p "${REPO_DIR}/.git/hooks"

cat << 'EOF' > "${HOOK_FILE}"
#!/usr/bin/env bash
# Agent Lifecycle Kit Pre-Commit Quality Gate
set -euo pipefail

REPO_DIR="$(git rev-parse --show-toplevel)"

echo "=== Pre-Commit Quality & Security Gate ==="

chmod +x "${REPO_DIR}/scripts/scan-skill-security.sh"
"${REPO_DIR}/scripts/scan-skill-security.sh"

chmod +x "${REPO_DIR}/scripts/validate-evals.sh"
"${REPO_DIR}/scripts/validate-evals.sh"

chmod +x "${REPO_DIR}/scripts/verify-skills-layout.sh"
"${REPO_DIR}/scripts/verify-skills-layout.sh"

echo "✅ Pre-commit quality gate PASSED."
EOF

chmod +x "${HOOK_FILE}"
echo "OK: Pre-commit hook installed to ${HOOK_FILE}"
