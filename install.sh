#!/usr/bin/env bash
# Bootstrap Agent Lifecycle Kit: clone or reuse a checkout, link ~/.agents, put kit on PATH.
# Usage: curl -fsSL https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main/install.sh | bash
# Prefer `| bash` (not `| sh`): this script needs bash features such as `pipefail`.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "error: run this installer with bash, e.g.:" >&2
  echo "  curl -fsSL https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main/install.sh | bash" >&2
  exit 1
fi
set -euo pipefail

GITHUB_REPO="${KIT_GITHUB_REPO:-mzworthington/agent-lifecycle-kit}"
KIT_DIR="${KIT_DIR:-}"
GIT_REF="${KIT_REF:-main}"
INSTALL_MCP="${INSTALL_MCP:-1}"
INSTALL_EXTERNAL_SKILLS="${INSTALL_EXTERNAL_SKILLS:-0}"
MIN_NODE_MAJOR=22

usage() {
  cat <<'EOF'
Agent Lifecycle Kit installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/mzworthington/agent-lifecycle-kit/main/install.sh | bash
  curl -fsSL .../install.sh | bash -s -- [options]
  ./install.sh [options]     # from a kit checkout

Puts kit on PATH (~/.local/bin), links ~/.agents, and installs the default MCP profile.

Then, in an app repo:
  kit init . --mcp default --hook

Options:
  --dir <path>     Clone destination (default: $HOME/.local/share/agent-lifecycle-kit)
  --ref <git-ref>  Branch or tag to clone (default: main)
  -h, --help       Show this help

Environment:
  KIT_DIR                    Same as --dir
  KIT_REF                    Same as --ref
  KIT_GITHUB_REPO            GitHub owner/repo (default: mzworthington/agent-lifecycle-kit)
  INSTALL_MCP                Set to 0 to skip MCP compose
  INSTALL_EXTERNAL_SKILLS    Set to 1 to sync Cloudflare/Vercel skills
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      KIT_DIR="${2:-}"
      if [[ -z "${KIT_DIR}" ]]; then
        echo "error: --dir requires a path" >&2
        exit 1
      fi
      shift 2
      ;;
    --ref)
      GIT_REF="${2:-}"
      if [[ -z "${GIT_REF}" ]]; then
        echo "error: --ref requires a branch or tag" >&2
        exit 1
      fi
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

is_kit_checkout() {
  local dir="$1"
  [[ -f "${dir}/bin/kit.ts" && -f "${dir}/package.json" && -f "${dir}/AGENTS.md" ]]
}

resolve_self_dir() {
  local source="${BASH_SOURCE[0]:-}"
  if [[ -z "${source}" || "${source}" == "-" ]]; then
    return 1
  fi
  local dir
  dir="$(cd "$(dirname "${source}")" 2>/dev/null && pwd)" || return 1
  printf '%s\n' "${dir}"
}

resolve_agents_checkout() {
  local target="${HOME}/.agents"
  if [[ ! -e "${target}" ]]; then
    return 1
  fi
  local resolved
  resolved="$(cd "${target}" 2>/dev/null && pwd)" || return 1
  if is_kit_checkout "${resolved}"; then
    printf '%s\n' "${resolved}"
    return 0
  fi
  return 1
}

need_cmd() {
  local name="$1"
  if ! command -v "${name}" >/dev/null 2>&1; then
    echo "error: ${name} is required to install kit" >&2
    exit 1
  fi
}

ensure_node() {
  need_cmd node
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ -z "${major}" || "${major}" -lt "${MIN_NODE_MAJOR}" ]]; then
    echo "error: Node ${MIN_NODE_MAJOR}+ is required (found $(node -v))" >&2
    exit 1
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    echo "Enabling pnpm via corepack"
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@latest --activate
    return 0
  fi
  echo "error: pnpm is required. Install Node ${MIN_NODE_MAJOR}+ (includes corepack) or: npm install -g pnpm" >&2
  exit 1
}

ensure_deps() {
  local repo_dir="$1"
  ensure_node
  ensure_pnpm
  echo "Installing kit dependencies in ${repo_dir}"
  (cd "${repo_dir}" && pnpm install)
}

clone_or_update() {
  local dest="$1"
  local url="https://github.com/${GITHUB_REPO}.git"
  if [[ -d "${dest}/.git" ]]; then
    local origin
    origin="$(git -C "${dest}" remote get-url origin 2>/dev/null || true)"
    if [[ "${origin}" != *"${GITHUB_REPO}"* ]]; then
      echo "error: ${dest} origin is ${origin:-unset}, expected ${GITHUB_REPO}" >&2
      exit 1
    fi
    echo "Updating ${dest} (${GIT_REF})"
    git -C "${dest}" fetch --depth 1 origin "${GIT_REF}"
    git -C "${dest}" checkout -q "${GIT_REF}"
    git -C "${dest}" pull --ff-only origin "${GIT_REF}"
    return 0
  fi
  if [[ -e "${dest}" ]]; then
    echo "error: ${dest} exists and is not a kit git checkout. Pass --dir to pick another path." >&2
    exit 1
  fi
  mkdir -p "$(dirname "${dest}")"
  echo "Cloning ${url} (${GIT_REF}) into ${dest}"
  git clone --depth 1 --branch "${GIT_REF}" "${url}" "${dest}"
}

link_agents() {
  local repo_dir="$1"
  local target="${HOME}/.agents"
  if [[ -L "${target}" ]]; then
    local current
    current="$(readlink "${target}")"
    if [[ "${current}" == "${repo_dir}" ]]; then
      echo "OK: ${target} already points to this checkout"
      return 0
    fi
    echo "WARN: ${target} is a symlink to ${current}"
    echo "      Remove it first if you want to repoint to ${repo_dir}"
    return 1
  fi

  if [[ -e "${target}" && ! -L "${target}" ]]; then
    echo "ERROR: ${target} exists and is not a symlink. Move or rename it first."
    return 1
  fi

  ln -s "${repo_dir}" "${target}"
  echo "Linked ${target} -> ${repo_dir}"
}

ensure_system_config() {
  local repo_dir="$1"
  if [[ ! -f "${repo_dir}/system/config.json" ]]; then
    cp "${repo_dir}/system/config.example.json" "${repo_dir}/system/config.json"
    echo "Created system/config.json from example (edit project name as needed)"
  fi
}

install_mcp_profile() {
  local repo_dir="$1"
  if [[ "${INSTALL_MCP}" != "1" ]]; then
    echo "Skipping MCP install (INSTALL_MCP=${INSTALL_MCP})"
    return 0
  fi

  local kit="${repo_dir}/bin/kit"
  if [[ ! -x "${kit}" ]]; then
    echo "WARN: ${kit} missing or not executable; skipping MCP install"
    return 0
  fi

  echo ""
  echo "Installing default MCP profile to ~/.cursor/mcp.json"
  "${kit}" mcp default --install || {
    echo "WARN: MCP compose/install failed; continue and run kit mcp default --install"
    return 0
  }
  echo "Set GITHUB_PERSONAL_ACCESS_TOKEN in the environment that launches Cursor for the GitHub MCP."
  echo "More profiles: collab | personal | lab | devtools | cloud | project-example"
  echo "  kit mcp collab --install"
  echo "  kit mcp personal --install   # Bitwarden/LinkedIn/Polyglot/Obsidian (local)"
  echo "  kit mcp lab --install        # Raspberry Pi over SSH (local)"
  echo "Project-scoped: compose project-example or templates/project-mcp.json into .cursor/mcp.json"
  echo "Skip later with: INSTALL_MCP=0 ./install.sh"
}

install_external_skills() {
  local repo_dir="$1"
  if [[ "${INSTALL_EXTERNAL_SKILLS}" != "1" ]]; then
    echo "Skipping external skills (set INSTALL_EXTERNAL_SKILLS=1 to sync Cloudflare/Vercel skills)"
    return 0
  fi

  local kit="${repo_dir}/bin/kit"
  if [[ ! -x "${kit}" ]]; then
    echo "WARN: ${kit} missing or not executable; skipping external skills"
    return 0
  fi

  echo ""
  echo "Syncing external skills from skills/external.lock.json"
  "${kit}" sync --install || {
    echo "WARN: external skills sync failed; run kit sync --install manually"
    return 0
  }
}

export_ide_rules() {
  local repo_dir="$1"
  local kit="${repo_dir}/bin/kit"
  if [[ -x "${kit}" ]]; then
    echo ""
    echo "Exporting Multi-IDE rules (CLAUDE.md, .windsurfrules, Copilot)..."
    "${kit}" export-rules || true
  fi
}

install_cli_bin() {
  local repo_dir="$1"
  local target_bin="${HOME}/.local/bin"
  if [[ ! -d "${target_bin}" && -d "${HOME}/bin" ]]; then
    target_bin="${HOME}/bin"
  fi
  mkdir -p "${target_bin}"
  ln -sf "${repo_dir}/bin/kit" "${target_bin}/kit"
  echo "Linked CLI: ${target_bin}/kit -> ${repo_dir}/bin/kit"
  case ":${PATH}:" in
    *":${target_bin}:"*) ;;
    *)
      echo ""
      echo "Add ${target_bin} to PATH, then open a new shell:"
      echo "  export PATH=\"${target_bin}:\$PATH\""
      ;;
  esac
}

bootstrap_checkout() {
  local repo_dir="$1"
  ensure_deps "${repo_dir}"
  link_agents "${repo_dir}"
  ensure_system_config "${repo_dir}"
  export_ide_rules "${repo_dir}"
  install_mcp_profile "${repo_dir}"
  install_external_skills "${repo_dir}"
  install_cli_bin "${repo_dir}"

  echo ""
  echo "Agent Lifecycle Kit is ready."
  echo "Unified CLI: kit (or pnpm kit)"
  echo "In an app repo:"
  echo "  kit init . --mcp default --hook"
  echo "External skills: INSTALL_EXTERNAL_SKILLS=1 ./install.sh  or  kit sync --install"
}

SELF_DIR="$(resolve_self_dir || true)"

if [[ -n "${SELF_DIR}" ]] && is_kit_checkout "${SELF_DIR}"; then
  bootstrap_checkout "${SELF_DIR}"
  exit 0
fi

need_cmd git
ensure_node

DEST="${KIT_DIR}"
if [[ -z "${DEST}" ]]; then
  DEST="$(resolve_agents_checkout || true)"
fi
if [[ -z "${DEST}" ]]; then
  DEST="${HOME}/.local/share/agent-lifecycle-kit"
fi

clone_or_update "${DEST}"
if ! is_kit_checkout "${DEST}"; then
  echo "error: ${DEST} is not a kit checkout after clone" >&2
  exit 1
fi
exec bash "${DEST}/install.sh"
