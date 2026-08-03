#!/usr/bin/env bash
# Bootstrap ~/.agents symlink and optional Cursor MCP profile for local development.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.agents"
INSTALL_MCP="${INSTALL_MCP:-1}"
INSTALL_EXTERNAL_SKILLS="${INSTALL_EXTERNAL_SKILLS:-0}"

link_agents() {
  if [[ -L "${TARGET}" ]]; then
    current="$(readlink "${TARGET}")"
    if [[ "${current}" == "${REPO_DIR}" ]]; then
      echo "OK: ${TARGET} already points to this repo"
      return 0
    fi
    echo "WARN: ${TARGET} is a symlink to ${current}"
    echo "      Remove it first if you want to repoint to ${REPO_DIR}"
    return 1
  fi

  if [[ -e "${TARGET}" && ! -L "${TARGET}" ]]; then
    echo "ERROR: ${TARGET} exists and is not a symlink. Move or rename it first."
    return 1
  fi

  ln -s "${REPO_DIR}" "${TARGET}"
  echo "Linked ${TARGET} -> ${REPO_DIR}"
}

ensure_system_config() {
  if [[ ! -f "${REPO_DIR}/system/config.json" ]]; then
    cp "${REPO_DIR}/system/config.example.json" "${REPO_DIR}/system/config.json"
    echo "Created system/config.json from example (edit project name as needed)"
  fi
}

install_mcp_profile() {
  if [[ "${INSTALL_MCP}" != "1" ]]; then
    echo "Skipping MCP install (INSTALL_MCP=${INSTALL_MCP})"
    return 0
  fi

  local compose="${REPO_DIR}/scripts/compose-mcp.sh"
  if [[ ! -x "${compose}" ]]; then
    echo "WARN: ${compose} missing or not executable; skipping MCP install"
    return 0
  fi

  echo ""
  echo "Installing default MCP profile to ~/.cursor/mcp.json"
  "${compose}" default --install || {
    echo "WARN: MCP compose/install failed; continue and run scripts/compose-mcp.sh manually"
    return 0
  }
  echo "Set GITHUB_PERSONAL_ACCESS_TOKEN in the environment that launches Cursor for the GitHub MCP."
  echo "More profiles: collab | personal | lab | devtools | cloud | project-example"
  echo "  ./scripts/compose-mcp.sh collab --install"
  echo "  ./scripts/compose-mcp.sh personal --install   # Bitwarden/LinkedIn/Polyglot/Obsidian (local)"
  echo "  ./scripts/compose-mcp.sh lab --install        # Raspberry Pi over SSH (local)"
  echo "Project-scoped: compose project-example or templates/project-mcp.json into .cursor/mcp.json"
  echo "Skip later with: INSTALL_MCP=0 ./install.sh"
}

install_external_skills() {
  if [[ "${INSTALL_EXTERNAL_SKILLS}" != "1" ]]; then
    echo "Skipping external skills (set INSTALL_EXTERNAL_SKILLS=1 to sync Cloudflare/Vercel skills)"
    return 0
  fi

  local sync="${REPO_DIR}/scripts/sync-external-skills.sh"
  if [[ ! -x "${sync}" ]]; then
    echo "WARN: ${sync} missing or not executable; skipping external skills"
    return 0
  fi

  echo ""
  echo "Syncing external skills from skills/external.lock.json"
  "${sync}" --install || {
    echo "WARN: external skills sync failed; run ./scripts/sync-external-skills.sh --install manually"
    return 0
  }
}

link_agents
ensure_system_config
install_mcp_profile
install_external_skills

echo ""
echo "Optional: add to a project repo (copy templates/project-AGENTS.md as AGENTS.md):"
echo '  Standards and lifecycle agents live in ~/.agents - read ~/.agents/AGENTS.md before starting work'
echo "External skills: INSTALL_EXTERNAL_SKILLS=1 ./install.sh  or  ./scripts/sync-external-skills.sh --install"
