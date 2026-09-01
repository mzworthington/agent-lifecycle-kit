export const KIT_HELP = `
🤖 Agent Lifecycle Kit CLI (kit)

Usage: kit <command> [options]
       agent-kit <command> [options]

Commands:
  init [dir]           Bootstrap AGENTS.md, multi-IDE rules, .cursor/mcp.json & git hook
  mcp <profile>        Compose and install a named MCP profile from mcps/profiles/
  audit                Run security & supply chain audit across skills and scripts
  validate             Validate evals structure against JSON schemas
  eval                 Run live trigger evals, or EDD subcommands (run|watch|report|ci|shadow|dataset)
  export-rules [dir]   Export and sync AGENTS.md to CLAUDE.md, .windsurfrules & Copilot rules
  metrics              Display telemetry analytics summary for subagent phase handovers
  verify               Verify skills directory layout conventions
  sync                 Sync official external skills (Cloudflare, Vercel)
  measure-context      Report always-on context budget
  debug-board <proj>   Scaffold a hypothesis-driven debug board
  debug-ci             Fetch failed GitHub Actions logs
  check                Run the local quality gate (audit, ontology, evals, EDD CI, context budget)
  ontology generate    Dump derived ontology index to gitignored sync/ and web/public/assets/
  ontology check       Validate live-derived index (skill mcp/depends-on refs)
  memory lint          List legacy memory entities outside the ontology allowlist
  site assemble        Copy web/dist plus public Markdown into site/ (needs web build first; optional --out)
  help                 Display this help menu

Examples:
  kit init ./my-app --mcp collab --hook
  kit mcp ops --install
  kit mcp cloudflare-ops --install
  kit audit
  kit eval
  kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
  kit eval ci --threshold-routing 95 --out out/reports
  kit eval report --format md --out out/reports
  kit ontology generate
  kit ontology check
  kit memory lint
  kit site assemble
  kit export-rules
  kit metrics
  kit sync --install
  kit debug-board archlens "initial load overlap"
  kit check
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
