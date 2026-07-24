#!/usr/bin/env bash
# Bootstrap ~/.agents symlink for local development.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.agents"

if [[ -L "${TARGET}" ]]; then
  current="$(readlink "${TARGET}")"
  if [[ "${current}" == "${REPO_DIR}" ]]; then
    echo "OK: ${TARGET} already points to this repo"
    exit 0
  fi
  echo "WARN: ${TARGET} is a symlink to ${current}"
  echo "      Remove it first if you want to repoint to ${REPO_DIR}"
  exit 1
fi

if [[ -e "${TARGET}" && ! -L "${TARGET}" ]]; then
  echo "ERROR: ${TARGET} exists and is not a symlink. Move or rename it first."
  exit 1
fi

ln -s "${REPO_DIR}" "${TARGET}"
echo "Linked ${TARGET} -> ${REPO_DIR}"

if [[ ! -f "${REPO_DIR}/system/config.json" ]]; then
  cp "${REPO_DIR}/system/config.example.json" "${REPO_DIR}/system/config.json"
  echo "Created system/config.json from example (edit project name as needed)"
fi

echo ""
echo "Optional: add to a project repo (copy templates/project-AGENTS.md as AGENTS.md):"
echo '  Standards and lifecycle agents live in ~/.agents - read ~/.agents/AGENTS.md before starting work'
