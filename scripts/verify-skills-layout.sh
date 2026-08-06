#!/usr/bin/env bash
# Fail if skills/ contains directories outside kit naming prefixes.
# Upstream skills belong in ~/.cursor/skills (see skills/external.lock.json).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="${REPO_DIR}/skills"
ALLOWED='^(agent|profile|lang|framework)-'

errors=0

for entry in "${SKILLS_DIR}"/*; do
  [[ -e "${entry}" ]] || continue
  base="$(basename "${entry}")"

  case "${base}" in
    README.md|external.lock.json) continue ;;
  esac

  if [[ ! "${base}" =~ ${ALLOWED} ]]; then
    echo "ERROR: non-kit skill directory: skills/${base}" >&2
    echo "       Remove it or reinstall upstream skills to ~/.cursor/skills:" >&2
    echo "       ./scripts/sync-external-skills.sh --install" >&2
    errors=$((errors + 1))
  fi
done

if [[ "${errors}" -gt 0 ]]; then
  echo "" >&2
  echo "Found ${errors} invalid skill(s). See skills/README.md (Kit vs external)." >&2
  exit 1
fi

echo "OK: skills/ contains only kit-authored prefixes (agent-, profile-, lang-, framework-)"
