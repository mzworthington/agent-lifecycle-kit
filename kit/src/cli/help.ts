import { CLI_ALIASES, CLI_BIN } from './name.js';

const aliasLine = CLI_ALIASES.map((name) => `       ${name} <command> [options]`).join('\n');

export const KIT_HELP = `
Waykit CLI (${CLI_BIN})

Usage: ${CLI_BIN} <command> [options]
${aliasLine}

Day-to-day:
  Typo, bug, or failed CI   agent-debug (light XFN if UI/auth/SLO). Not grill → spec.
  Product feature           Full lifecycle in AGENTS.md
  Handshake / hygiene       ${CLI_BIN} align .    /  ${CLI_BIN} doctor
  Merge bar                 ${CLI_BIN} check

Commands:
  init [dir]           Bootstrap AGENTS.md, host rules, MCP configs, and git hooks
  doctor [dir]         Check community files on repos you admin (report only; --write fills gaps; --json)
  align [dir]          Check consumer handshake, host pointers, kit MCP, and commit-msg (report; --write seeds; --owned --scan fleet; --json)
  version              Print kit version, git describe, and whether ~/.agents is this clone (--check warns if origin is weeks ahead)
  mcp <profile>        Compose a named MCP profile from mcps/profiles/ (restore reapplies the previous project profile)
  audit                Run security & supply chain audit across skills and scripts
  validate             Validate evals structure against JSON schemas
  eval                 Run skill-trigger evals, or EDD subcommands (run|watch|report|ci|shadow|dataset)
  export-rules [dir]   Sync AGENTS.md into Cursor, Claude, Copilot, Gemini/Antigravity, and Windsurf pointers
  metrics              Display telemetry analytics summary for subagent phase handovers
  verify               Verify skills layout and role SKILL.md line budget
  sync                 Sync official external skills (Cloudflare, Vercel)
  measure-context      Report always-on context budget
  debug-board <proj>   Scaffold a hypothesis-driven debug board
  debug-ci             Fetch failed GitHub Actions logs
  check                Run the local quality gate (audit, ontology, evals, EDD CI, context budget; --json)
  ontology generate    Dump derived ontology index to gitignored sync/ and web/public/assets/
  ontology check       Validate live-derived index (skill mcp/depends-on refs)
  memory lint          List legacy memory entities outside the ontology allowlist
  model resolve        Resolve capability class + host slug (models/catalog.yaml)
  site assemble        Copy web/dist plus public Markdown into site/ (needs web build first; optional --out)
  commit-msg           Check a commit subject or PR title (conventional commits)
  completion <shell>   Print a live tab-completion stub (zsh or bash)
  completion install   Write the stub once; verbs stay in sync with this wk
  help                 Display this help menu

Examples:
  ${CLI_BIN} init ./my-app --mcp collab --hook
  ${CLI_BIN} doctor --owned --scan ~/Documents/dev
  ${CLI_BIN} doctor . --write --hook
  ${CLI_BIN} align .
  ${CLI_BIN} align . --write
  ${CLI_BIN} align . --json
  ${CLI_BIN} align --owned --scan ~/Documents/dev
  ${CLI_BIN} version
  ${CLI_BIN} version --check
  ${CLI_BIN} mcp ops --install
  ${CLI_BIN} mcp default --install --host claude
  ${CLI_BIN} mcp default --project
  ${CLI_BIN} mcp cloudflare-ops --project
  ${CLI_BIN} mcp restore --project
  ${CLI_BIN} mcp astro --install
  ${CLI_BIN} mcp cloudflare-ops --install
  ${CLI_BIN} mcp warp --install
  ${CLI_BIN} mcp posthog --install
  ${CLI_BIN} audit
  ${CLI_BIN} eval
  ${CLI_BIN} eval run --suite evals/edd/architecture_routing.yaml --model scripted
  ${CLI_BIN} eval ci --threshold-routing 95 --out out/reports
  ${CLI_BIN} eval report --format md --out out/reports
  ${CLI_BIN} ontology generate
  ${CLI_BIN} ontology check
  ${CLI_BIN} memory lint
  ${CLI_BIN} model resolve --skill agent-tdd --spec-complete --host cursor
  ${CLI_BIN} model resolve --skill agent-tdd --spec-complete --host claude
  ${CLI_BIN} site assemble
  ${CLI_BIN} export-rules
  ${CLI_BIN} metrics
  ${CLI_BIN} sync --install
  ${CLI_BIN} debug-board archlens "initial load overlap"
  ${CLI_BIN} completion install
  ${CLI_BIN} check
  ${CLI_BIN} check --json
`;

export function printKitHelp(log: (msg: string) => void = console.log): void {
  log(KIT_HELP);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function stackMessage(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err);
}
