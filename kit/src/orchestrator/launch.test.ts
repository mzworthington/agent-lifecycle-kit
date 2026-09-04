import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildSpecialistLaunchPrompt,
  composeSpecialistLaunch,
  definitionOfDoneForPhase,
  listHandoverPaths,
  parseHandoverContract,
  phaseForSkill,
  recommendedNextAgent,
  resolveHandoverDir,
  sameSessionGears
} from './launch.js';

const kitRoot = fileURLToPath(new URL('../../..', import.meta.url));

const completeSpec = `# Handover: spec

## Metadata

| Field | Value |
|-------|-------|
| **Phase** | spec |
| **Status** | COMPLETE |
| **Project** | canvas |
| **Next agent** | \`agent-tdd\` |
| **Linear ticket** | \`WAY-123\` |
`;

const blockedTdd = `# Handover: tdd

| **Phase** | tdd |
| **Status** | BLOCKED |
| **Next agent** | agent-xfn |
| **Linear ticket** | n/a |
`;

describe('parseHandoverContract', () => {
  it('reads COMPLETE, Next agent, ticket, and phase from a spec handover', () => {
    const contract = parseHandoverContract(completeSpec, '/tmp/handover_spec.md');
    assert.equal(contract.status, 'COMPLETE');
    assert.equal(contract.nextAgent, 'agent-tdd');
    assert.equal(contract.ticket, 'WAY-123');
    assert.equal(contract.phase, 'spec');
    assert.equal(contract.path, '/tmp/handover_spec.md');
  });

  it('reads BLOCKED and does not invent a ticket from n/a', () => {
    const contract = parseHandoverContract(blockedTdd, 'handover_tdd.md');
    assert.equal(contract.status, 'BLOCKED');
    assert.equal(contract.nextAgent, 'agent-xfn');
    assert.equal(contract.ticket, null);
    assert.equal(contract.phase, 'tdd');
  });

  it('returns null status when the file is a chat summary, not a handover', () => {
    const contract = parseHandoverContract('The child said it finished the spec. Looks good.');
    assert.equal(contract.status, null);
    assert.equal(contract.nextAgent, null);
  });
});

describe('buildSpecialistLaunchPrompt', () => {
  it('includes Linear id, handover paths, Definition of Done, and Next agent', () => {
    const built = buildSpecialistLaunchPrompt({
      skill: 'agent-spec',
      project: 'waykit',
      ticket: 'MZW-63',
      handoverPaths: ['/tmp/handover/waykit/handover_prd.md'],
      definitionOfDone: 'Gherkin scenarios; memory MCP updated or N/A',
      nextAgent: 'agent-tdd'
    });
    assert.match(built.prompt, /MZW-63/);
    assert.match(built.prompt, /handover_prd\.md/);
    assert.match(built.prompt, /Definition of Done/);
    assert.match(built.prompt, /Gherkin scenarios/);
    assert.match(built.prompt, /Next agent/);
    assert.match(built.prompt, /agent-tdd/);
    assert.match(built.prompt, /COMPLETE. or .BLOCKED/);
    assert.match(built.prompt, /summary only/i);
    assert.doesNotMatch(built.prompt, /kimi|gpt-5|opus/i);
    assert.equal(built.sameSessionGears, false);
  });

  it('keeps TDD gear 1 and gear 2 in the same child when ports are new', () => {
    const built = buildSpecialistLaunchPrompt({
      skill: 'agent-tdd',
      project: 'canvas',
      handoverPaths: ['/tmp/handover/canvas/handover_spec.md'],
      definitionOfDone: 'Gear 1 green; gear 2 done or N/A',
      nextAgent: 'agent-xfn',
      sameSessionGears: true
    });
    assert.equal(built.sameSessionGears, true);
    assert.match(built.prompt, /gear 1/i);
    assert.match(built.prompt, /gear 2/i);
    assert.match(built.prompt, /same (child )?session/i);
    assert.equal(built.ticket, null);
  });
});

describe('recommendedNextAgent and phaseForSkill', () => {
  it('maps sequential specialists to the next role and phase', () => {
    assert.equal(recommendedNextAgent('agent-spec'), 'agent-tdd');
    assert.equal(recommendedNextAgent('agent-tdd'), 'agent-xfn');
    assert.equal(phaseForSkill('agent-spec'), 'spec');
    assert.equal(phaseForSkill('agent-tdd'), 'tdd');
    assert.equal(sameSessionGears('agent-tdd'), true);
    assert.equal(sameSessionGears('agent-spec'), false);
  });
});

describe('definitionOfDoneForPhase', () => {
  it('extracts the spec and tdd short-loop rows from the kit handover template', () => {
    const template = fs.readFileSync(path.join(kitRoot, 'templates', 'handover.md'), 'utf8');
    const spec = definitionOfDoneForPhase(template, 'spec');
    assert.match(spec, /Gherkin/i);
    const tdd = definitionOfDoneForPhase(template, 'tdd');
    assert.match(tdd, /Gear 1/i);
    assert.match(tdd, /gear 2/i);
  });
});

describe('composeSpecialistLaunch', () => {
  it('resolves the Cursor slug from the catalog and fills the launch contract', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-compose-'));
    const home = path.join(tmp, 'home');
    const dir = path.join(home, '.agents', 'handover', 'waykit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'handover_prd.md'), '# prd\n');
    const composed = composeSpecialistLaunch({
      kitRoot,
      skill: 'agent-spec',
      project: 'waykit',
      ticket: 'MZW-63',
      host: 'cursor',
      homedir: home
    });
    assert.equal(composed.model.class, 'plan');
    assert.equal(composed.model.host, 'cursor');
    assert.doesNotMatch(composed.model.model, /kimi|gpt-|opus/i);
    assert.match(composed.prompt, /MZW-63/);
    assert.match(composed.prompt, /handover_prd\.md/);
    assert.equal(composed.nextAgent, 'agent-tdd');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('handover directory helpers', () => {
  it('lists handover_*.md paths and prefers ~/.agents/handover/<project>', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-handover-'));
    const home = path.join(tmp, 'home');
    const kit = path.join(tmp, 'kit');
    const project = 'canvas';
    const homeDir = path.join(home, '.agents', 'handover', project);
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(homeDir, 'handover_prd.md'), '# prd\n');
    fs.writeFileSync(path.join(homeDir, 'handover_spec.md'), completeSpec);
    fs.writeFileSync(path.join(homeDir, 'notes.txt'), 'ignore');
    const resolved = resolveHandoverDir(project, { homedir: home, kitRoot: kit });
    assert.equal(resolved, homeDir);
    const paths = listHandoverPaths(homeDir);
    assert.deepEqual(
      paths.map((p) => path.basename(p)),
      ['handover_prd.md', 'handover_spec.md']
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
