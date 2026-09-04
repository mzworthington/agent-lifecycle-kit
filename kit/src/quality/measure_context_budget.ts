import fs from 'fs';
import path from 'path';
import { cliOutcomeFromOk, printCliOutcome } from '../cli/outcome.js';

export const DEFAULT_TARGET_CHARS = 8000;

export interface ContextBudgetResult {
  ok: boolean;
  alwaysOnChars: number;
  targetChars: number;
  breakdown: {
    agents: number;
    handshake: number;
    cursorRules: number;
    claude: number;
    copilot: number;
    gemini: number;
    windsurf: number;
    philosophy: number;
    skillDescriptions: number;
  };
}

function fileChars(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

function estimateTokens(chars: number): number {
  return Math.floor((chars + 3) / 4);
}

function skillDescriptionChars(skillsDir: string): number {
  if (!fs.existsSync(skillsDir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(skillsDir)) {
    const skillPath = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const text = fs.readFileSync(skillPath, 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const dm = m[1].match(/description:\s*>-\s*\n((?:[ \t].+\n)+)|description:\s*(.+)/);
    if (!dm) continue;
    const d = (dm[1] || dm[2] || '').replace(/^[ \t]+/gm, '').trim();
    n += d.length;
  }
  return n;
}

export function measureContextBudget(
  repoDir: string,
  targetChars: number = DEFAULT_TARGET_CHARS
): ContextBudgetResult {
  const breakdown = {
    agents: fileChars(path.join(repoDir, 'AGENTS.md')),
    handshake: fileChars(path.join(repoDir, 'templates', 'project-AGENTS.md')),
    cursorRules: fileChars(path.join(repoDir, '.cursorrules')),
    claude: fileChars(path.join(repoDir, 'CLAUDE.md')),
    copilot: fileChars(path.join(repoDir, '.github', 'copilot-instructions.md')),
    gemini: fileChars(path.join(repoDir, 'GEMINI.md')),
    windsurf: fileChars(path.join(repoDir, '.windsurfrules')),
    philosophy: fileChars(path.join(repoDir, 'CODING_PHILOSOPHY.md')),
    skillDescriptions: skillDescriptionChars(path.join(repoDir, 'skills'))
  };
  const alwaysOnChars = breakdown.agents + breakdown.handshake;
  return {
    ok: alwaysOnChars <= targetChars,
    alwaysOnChars,
    targetChars,
    breakdown
  };
}

export function printContextBudget(result: ContextBudgetResult): void {
  const { breakdown, alwaysOnChars, targetChars, ok } = result;
  const targetTokens = Math.floor(targetChars / 4);
  console.log('Context budget report');
  console.log('=====================');
  console.log(`AGENTS.md                 ${breakdown.agents} chars (~${estimateTokens(breakdown.agents)} tokens)`);
  console.log(
    `project-AGENTS.md         ${breakdown.handshake} chars (~${estimateTokens(breakdown.handshake)} tokens)`
  );
  console.log(
    `.cursorrules              ${breakdown.cursorRules} chars (~${estimateTokens(breakdown.cursorRules)} tokens) [host pointer, not summed]`
  );
  console.log(
    `CLAUDE.md                 ${breakdown.claude} chars (~${estimateTokens(breakdown.claude)} tokens) [host pointer, not summed]`
  );
  console.log(
    `copilot-instructions.md   ${breakdown.copilot} chars (~${estimateTokens(breakdown.copilot)} tokens) [host pointer, not summed]`
  );
  console.log(
    `GEMINI.md                 ${breakdown.gemini} chars (~${estimateTokens(breakdown.gemini)} tokens) [host pointer, not summed]`
  );
  console.log(
    `.windsurfrules            ${breakdown.windsurf} chars (~${estimateTokens(breakdown.windsurf)} tokens) [host pointer, not summed]`
  );
  console.log(
    `CODING_PHILOSOPHY.md      ${breakdown.philosophy} chars (~${estimateTokens(breakdown.philosophy)} tokens) [on-demand only]`
  );
  console.log(
    `Skill descriptions sum    ${breakdown.skillDescriptions} chars (~${estimateTokens(breakdown.skillDescriptions)} tokens) [discovery]`
  );
  console.log('');
  console.log(`Always-on estimate        ${alwaysOnChars} chars (~${estimateTokens(alwaysOnChars)} tokens)`);
  console.log(`Target                    < ${targetChars} chars (~${targetTokens} tokens)`);
  console.log('A session loads AGENTS.md plus one host pointer, not every host file at once.');
  printCliOutcome(
    cliOutcomeFromOk(ok),
    'measure-context',
    ok ? 'always-on surface within 8KB' : 'always-on surface exceeds target'
  );
  if (ok) {
    console.log('Tip: zero full SOP/philosophy reads on typo/debug routes; use kit-knowledge MCP.');
  }
}
