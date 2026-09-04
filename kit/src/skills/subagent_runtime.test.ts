import os from 'node:os';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { collectFlagValues } from '../cli/flags.js';
import {
  buildLaunchPrompt,
  formatSubagentStatus,
  renderLaunchPrompt,
  subagentStatus
} from './subagent_runtime.js';

const kitRoot = fileURLToPath(new URL('../../..', import.meta.url));

describe('subagent_runtime', () => {
  it('collects repeatable --handover flags', () => {
    assert.deepEqual(collectFlagValues(['--handover', 'a.md', '--handover', 'b.md'], '--handover'), [
      'a.md',
      'b.md'
    ]);
  });

  it('reports launch mode from the kit catalog when WK_SUBAGENTS is unset', () => {
    const status = subagentStatus({ repoDir: kitRoot, env: {}, homedir: os.homedir() });
    assert.equal(status.skillsOnly, false);
    assert.equal(status.catalogSkillsOnly, false);
    assert.ok(status.generate.includes('agent-tdd'));
    assert.match(status.expandKillIndicator, /from-trace/);
    assert.equal(status.compare.decision, 'not-enough');
    assert.equal(status.compare.specialist.rate, null);
    assert.match(formatSubagentStatus(status), /mode: launch/);
    assert.match(formatSubagentStatus(status), /launch-prompt/);
    assert.match(formatSubagentStatus(status), /compare: not-enough/);
    assert.match(formatSubagentStatus(status), /wk eval compare/);
    assert.doesNotMatch(formatSubagentStatus(status), /specialist-launch: 0\.0%/);
  });

  it('honors WK_SUBAGENTS=0 in status', () => {
    const status = subagentStatus({
      repoDir: kitRoot,
      env: { WK_SUBAGENTS: '0' },
      homedir: os.tmpdir()
    });
    assert.equal(status.skillsOnly, true);
    assert.match(formatSubagentStatus(status), /mode: skills-only/);
  });

  it('renders a parent Task prompt that names the eval adapter', () => {
    const body = renderLaunchPrompt({
      skill: 'agent-tdd',
      project: 'archlens',
      linearId: 'MZW-59',
      handoverPaths: ['~/.agents/handover/archlens/handover_spec.md'],
      nextAgent: 'agent-xfn',
      modelClass: 'implement',
      readonly: false
    });
    assert.match(body, /eval adapter/);
    assert.match(body, /~\/.cursor\/agents\/agent-tdd.md/);
    assert.match(body, /MZW-59/);
    assert.match(body, /agent-xfn/);
    assert.match(body, /COMPLETE or BLOCKED/);
  });

  it('builds a prompt from the kit allowlist for audit specialists', () => {
    const body = buildLaunchPrompt({
      repoDir: kitRoot,
      skill: 'agent-review',
      project: 'waykit',
      handoverPaths: []
    });
    assert.match(body, /Readonly: true/);
    assert.match(body, /agent-review/);
  });

  it('refuses to prompt for a skill that is not a subagent', () => {
    assert.throws(
      () =>
        buildLaunchPrompt({
          repoDir: kitRoot,
          skill: 'agent-copy',
          project: 'waykit',
          handoverPaths: []
        }),
      /not on the host-subagent generate list/
    );
  });
});
