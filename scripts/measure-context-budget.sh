#!/usr/bin/env bash
# Estimate always-on context surface for the agent lifecycle kit.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_CHARS=8000
TARGET_TOKENS=$((TARGET_CHARS / 4))

chars() {
  local f="$1"
  if [[ -f "$f" ]]; then
    wc -c < "$f" | tr -d ' '
  else
    echo 0
  fi
}

estimate_tokens() {
  local c="$1"
  echo $(( (c + 3) / 4 ))
}

AGENTS_C=$(chars "${REPO_DIR}/AGENTS.md")
PHILOSOPHY_C=$(chars "${REPO_DIR}/CODING_PHILOSOPHY.md")
HANDSHAKE_C=$(chars "${REPO_DIR}/templates/project-AGENTS.md")
CURSORRULES_C=$(chars "${REPO_DIR}/.cursorrules")
CLAUDE_C=$(chars "${REPO_DIR}/CLAUDE.md")

# Always-on for consumers: thin AGENTS + IDE pointer rules (not full philosophy)
ALWAYS_ON=$((AGENTS_C + HANDSHAKE_C + CURSORRULES_C + CLAUDE_C))
ALWAYS_TOKENS=$(estimate_tokens "${ALWAYS_ON}")

SKILLS_DESC=0
if command -v node >/dev/null 2>&1; then
  SKILLS_DESC="$(
    node --import tsx/esm -e "
      import fs from 'fs';
      import path from 'path';
      const root = process.argv[1];
      let n = 0;
      for (const name of fs.readdirSync(path.join(root, 'skills'))) {
        const p = path.join(root, 'skills', name, 'SKILL.md');
        if (!fs.existsSync(p)) continue;
        const text = fs.readFileSync(p, 'utf8');
        const m = text.match(/^---\\n([\\s\\S]*?)\\n---/);
        if (!m) continue;
        const dm = m[1].match(/description:\\s*>-\\s*\\n((?:[ \\t].+\\n)+)|description:\\s*(.+)/);
        if (!dm) continue;
        const d = (dm[1] || dm[2] || '').replace(/^[ \\t]+/gm, '').trim();
        n += d.length;
      }
      process.stdout.write(String(n));
    " "${REPO_DIR}"
  )"
fi

echo "Context budget report"
echo "====================="
echo "AGENTS.md                 ${AGENTS_C} chars (~$(estimate_tokens "${AGENTS_C}") tokens)"
echo "project-AGENTS.md         ${HANDSHAKE_C} chars (~$(estimate_tokens "${HANDSHAKE_C}") tokens)"
echo ".cursorrules              ${CURSORRULES_C} chars (~$(estimate_tokens "${CURSORRULES_C}") tokens)"
echo "CLAUDE.md (pointer)       ${CLAUDE_C} chars (~$(estimate_tokens "${CLAUDE_C}") tokens)"
echo "CODING_PHILOSOPHY.md      ${PHILOSOPHY_C} chars (~$(estimate_tokens "${PHILOSOPHY_C}") tokens) [on-demand only]"
echo "Skill descriptions sum    ${SKILLS_DESC} chars (~$(estimate_tokens "${SKILLS_DESC}") tokens) [discovery]"
echo ""
echo "Always-on estimate        ${ALWAYS_ON} chars (~${ALWAYS_TOKENS} tokens)"
echo "Target                    < ${TARGET_CHARS} chars (~${TARGET_TOKENS} tokens)"

if (( ALWAYS_ON > TARGET_CHARS )); then
  echo ""
  echo "FAIL: always-on surface exceeds target. Thin AGENTS.md / handshake; keep philosophy on-demand."
  exit 1
fi

echo ""
echo "PASS: always-on surface within target."
echo "Tip: zero full SOP/philosophy reads on typo/debug routes; use kit-knowledge MCP."
