import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { loadModelCatalog, resolveModelClass, type ModelClass } from '../models/catalog.js';
import { loadSubagentAllowlist, type SubagentAllowlist } from './subagents.js';

export const HOST_AGENT_STUB_BODY_LINE_BUDGET = 40;
export const HOST_AGENT_HOSTS = ['cursor', 'claude'] as const;
export type HostAgentHost = (typeof HOST_AGENT_HOSTS)[number];

export const HOST_AGENTS_REL = 'agents';

export interface HostAgentStubInput {
  skill: string;
  name: string;
  description: string;
  readonly: boolean;
  forbidSplitGears: boolean;
  modelClass: ModelClass | string;
}

export interface GenerateHostAgentsResult {
  dest: string;
  files: string[];
}

export interface HostAgentStubResult {
  ok: boolean;
  errors: string[];
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const parts = text.split('\n');
  return text.endsWith('\n') ? parts.length - 1 : parts.length;
}

function parseMarkdownFrontmatter(content: string): { data: Record<string, unknown>; body: string } | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const raw = content.slice(4, end).trim();
  try {
    const data = parseYaml(raw);
    if (!data || typeof data !== 'object') return null;
    const after = content.slice(end + 4);
    const body = after.startsWith('\n') ? after.slice(1) : after;
    return { data: data as Record<string, unknown>, body };
  } catch {
    return null;
  }
}

function yamlFolded(value: string): string {
  const lines = value
    .trim()
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return '""';
  return `>-\n${lines.map((line) => `  ${line}`).join('\n')}`;
}

function loadRoleSkill(kitRoot: string, skill: string): { name: string; description: string; body: string } {
  const skillMd = path.join(kitRoot, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    throw new Error(`listed skill missing SKILL.md: ${skill}`);
  }
  const parsed = parseMarkdownFrontmatter(fs.readFileSync(skillMd, 'utf8'));
  if (!parsed) {
    throw new Error(`SKILL.md missing YAML frontmatter: ${skill}`);
  }
  const name = typeof parsed.data.name === 'string' && parsed.data.name.trim() ? parsed.data.name.trim() : skill;
  const description =
    typeof parsed.data.description === 'string' ? parsed.data.description.replace(/\s+/g, ' ').trim() : '';
  if (!description) {
    throw new Error(`SKILL.md missing description (when-to-delegate): ${skill}`);
  }
  return { name, description, body: parsed.body };
}

function modelClassFor(kitRoot: string, skill: string): string {
  try {
    return resolveModelClass(loadModelCatalog(kitRoot), { skill });
  } catch {
    return 'plan';
  }
}

function readonlyFor(catalog: SubagentAllowlist, skill: string): boolean {
  return catalog.bandSkills('readonly-audit').includes(skill);
}

export function renderHostAgentStub(input: HostAgentStubInput): string {
  const description = input.description.replace(/\s+/g, ' ').trim();
  const lines = [
    '---',
    `name: ${input.name}`,
    `description: ${yamlFolded(description)}`,
    'model: inherit',
    `# model-class: ${input.modelClass} — resolve host slug with: wk model resolve --skill ${input.skill}`
  ];
  if (input.readonly) {
    lines.push('readonly: true');
  }
  lines.push('---', '');
  lines.push(
    `Load \`skills/${input.skill}/SKILL.md\` and follow that playbook. Use **kit-knowledge** (\`get_sop\`, \`search_kit\`, \`get_philosophy_section\`) for SOP slices and philosophy. Do not copy procedure or philosophy into this file.`
  );
  if (input.forbidSplitGears) {
    lines.push('');
    lines.push(
      'Do not split gear 1 and gear 2. Both stay this agent. `agent-adapter` is the escape hatch when gear 2 is too large.'
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function generateHostAgents(kitRoot: string, destDir?: string): GenerateHostAgentsResult {
  const catalog = loadSubagentAllowlist(kitRoot);
  const dest = destDir ?? path.join(kitRoot, HOST_AGENTS_REL);
  const files: string[] = [];
  for (const host of HOST_AGENT_HOSTS) {
    const hostDir = path.join(dest, host);
    fs.mkdirSync(hostDir, { recursive: true });
    for (const skill of catalog.generateAgent) {
      const role = loadRoleSkill(kitRoot, skill);
      const markdown = renderHostAgentStub({
        skill,
        name: role.name,
        description: role.description,
        readonly: readonlyFor(catalog, skill),
        forbidSplitGears: catalog.tdd.skill === skill && catalog.tdd.sameAgent,
        modelClass: modelClassFor(kitRoot, skill)
      });
      const filePath = path.join(hostDir, `${skill}.md`);
      fs.writeFileSync(filePath, markdown, 'utf8');
      files.push(filePath);
    }
  }
  return { dest, files };
}

function skillBodyDuplicates(stubBody: string, skillBody: string): boolean {
  const stub = stubBody.toLowerCase();
  for (const line of skillBody.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length < 40) continue;
    if (/skills\/.+\/SKILL\.md/.test(trimmed)) continue;
    if (stub.includes(trimmed.toLowerCase())) return true;
  }
  return false;
}

function copiesPhilosophyOrSop(stubBody: string): boolean {
  return /CODING_PHILOSOPHY\.md|SOPs\/[A-Za-z0-9._/-]+\.md/.test(stubBody);
}

export function verifyHostAgentStubs(kitRoot: string, destDir?: string): HostAgentStubResult {
  const errors: string[] = [];
  let catalog: SubagentAllowlist;
  try {
    catalog = loadSubagentAllowlist(kitRoot);
  } catch (err: unknown) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
  const dest = destDir ?? path.join(kitRoot, HOST_AGENTS_REL);
  for (const skill of catalog.generateAgent) {
    let role: { name: string; description: string; body: string };
    try {
      role = loadRoleSkill(kitRoot, skill);
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }
    const expected = renderHostAgentStub({
      skill,
      name: role.name,
      description: role.description,
      readonly: readonlyFor(catalog, skill),
      forbidSplitGears: catalog.tdd.skill === skill && catalog.tdd.sameAgent,
      modelClass: modelClassFor(kitRoot, skill)
    });
    const expectedParsed = parseMarkdownFrontmatter(expected);
    for (const host of HOST_AGENT_HOSTS) {
      const rel = `${HOST_AGENTS_REL}/${host}/${skill}.md`;
      const filePath = path.join(dest, host, `${skill}.md`);
      if (!fs.existsSync(filePath)) {
        errors.push(`missing ${rel}`);
        continue;
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMarkdownFrontmatter(raw);
      if (!parsed) {
        errors.push(`${rel} is missing YAML frontmatter`);
        continue;
      }
      if (parsed.data.name !== role.name) {
        errors.push(`${rel} name "${String(parsed.data.name)}" does not match skill when-to-delegate name`);
      }
      const desc =
        typeof parsed.data.description === 'string' ? parsed.data.description.replace(/\s+/g, ' ').trim() : '';
      if (desc !== role.description) {
        errors.push(`${rel} description does not match skill when-to-delegate`);
      }
      if (parsed.data.model !== 'inherit') {
        errors.push(`${rel} model must be inherit (resolve slugs with wk model resolve --skill ${skill})`);
      }
      if (/cursor-grok|composer-2\.5|claude-sonnet|kimi/i.test(raw)) {
        errors.push(`${rel} hardcodes a host model id; use inherit + wk model resolve --skill ${skill}`);
      }
      if (readonlyFor(catalog, skill) && parsed.data.readonly !== true) {
        errors.push(`${rel} must set readonly: true`);
      }
      if (!readonlyFor(catalog, skill) && parsed.data.readonly === true) {
        errors.push(`${rel} must not set readonly: true`);
      }
      if (!parsed.body.includes(`skills/${skill}/SKILL.md`)) {
        errors.push(`${rel} must tell the specialist to load skills/${skill}/SKILL.md`);
      }
      if (!/kit-knowledge/i.test(parsed.body)) {
        errors.push(`${rel} must tell the specialist to use kit-knowledge for SOP slices`);
      }
      if (catalog.tdd.skill === skill && catalog.tdd.sameAgent && !/do not split gear 1 and gear 2/i.test(parsed.body)) {
        errors.push(`${rel} must forbid splitting gear 1 and gear 2`);
      }
      const bodyLines = countLines(parsed.body);
      if (bodyLines > HOST_AGENT_STUB_BODY_LINE_BUDGET) {
        errors.push(
          `host agent stub over line budget: ${rel} (${bodyLines} lines; budget ${HOST_AGENT_STUB_BODY_LINE_BUDGET}; playbook belongs in SKILL.md)`
        );
      }
      if (skillBodyDuplicates(parsed.body, role.body) || copiesPhilosophyOrSop(parsed.body)) {
        errors.push(`${rel} duplicates skill / SOP / philosophy playbook text`);
      }
      if (expectedParsed && countLines(parsed.body) > countLines(expectedParsed.body) + 4) {
        errors.push(`${rel} grew past the generated stub (keep it a load-this-skill prompt)`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function printHostAgentStubResult(result: HostAgentStubResult): void {
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: host agent stub: ${error}`);
    }
    return;
  }
  console.log('OK: host agent stubs (thin, allowlisted, no playbook duplication)');
}
