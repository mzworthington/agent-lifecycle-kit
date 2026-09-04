import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LOAD_SKILL,
  LOAD_SKILL_TOOL_FILE,
  SKILLS_ONLY_PROMPT_FILE,
  applySkillsOnlyCases,
  matchHostSpecialist,
  remapLaunchExpectToLoadSkill,
  rewriteSubagentSuiteForSkillsOnly,
  shouldRemapSubagentExpects,
  specialistToolName
} from './subagent-route.js';

describe('matchHostSpecialist', () => {
  it('routes review, debug, tdd, xfn, spec, and security', () => {
    assert.equal(
      matchHostSpecialist('Review the PR as an independent audit.')?.specialist,
      'agent-review'
    );
    assert.equal(
      matchHostSpecialist('CI failed on main. Isolate the failed GitHub Actions logs.')?.specialist,
      'agent-debug'
    );
    assert.equal(
      matchHostSpecialist('Spec handover is COMPLETE. Launch the TDD short loop.')?.specialist,
      'agent-tdd'
    );
    assert.equal(
      matchHostSpecialist('Green the browser E2E apply rows.')?.specialist,
      'agent-xfn'
    );
    assert.equal(
      matchHostSpecialist('Draft the spec after grilling.')?.specialist,
      'agent-spec'
    );
    assert.equal(
      matchHostSpecialist('Independent OWASP security audit of this PR.')?.specialist,
      'agent-security'
    );
  });

  it('stays in the parent for typos and small talk', () => {
    assert.equal(matchHostSpecialist('Fix a typo in the README.'), null);
    assert.equal(matchHostSpecialist('What is the weather in Oslo?'), null);
  });
});

describe('skills-only expect remap', () => {
  it('names launch vs load_skill from the switch', () => {
    assert.equal(specialistToolName(false), 'launch_specialist');
    assert.equal(specialistToolName(true), LOAD_SKILL);
  });

  it('rewrites launch expects and leaves no_tool alone', () => {
    assert.deepEqual(
      remapLaunchExpectToLoadSkill({
        tool: 'launch_specialist',
        arguments_contains: { specialist: 'agent-review' }
      }),
      { tool: LOAD_SKILL, arguments_contains: { specialist: 'agent-review' } }
    );
    assert.deepEqual(remapLaunchExpectToLoadSkill({ no_tool: true }), { no_tool: true });
  });

  it('remaps when the env is on or the suite already registered load_skill', () => {
    assert.equal(shouldRemapSubagentExpects(false, ['tools/launch_specialist.json']), false);
    assert.equal(shouldRemapSubagentExpects(true, ['tools/launch_specialist.json']), true);
    assert.equal(shouldRemapSubagentExpects(false, ['tools/load_skill.json']), true);
  });

  it('swaps the default suite onto the parent-skill prompt and tool', () => {
    const rewritten = rewriteSubagentSuiteForSkillsOnly({
      name: 'Routing: Host subagent launch',
      dataset: 'subagent_routing.jsonl',
      system_prompt: 'subagent_routing_prompt.md',
      mcp_tools: ['tools/launch_specialist.json'],
      mocks: [{ tool: 'launch_specialist', response: { launched: true } }],
      metrics: [{ type: 'tool_selection' }]
    });
    assert.equal(rewritten.system_prompt, SKILLS_ONLY_PROMPT_FILE);
    assert.deepEqual(rewritten.mcp_tools, [LOAD_SKILL_TOOL_FILE]);
    assert.equal(rewritten.mocks?.[0]?.tool, LOAD_SKILL);
  });

  it('rewrites dataset rows that expect a launch', () => {
    const [remapped] = applySkillsOnlyCases([
      {
        id: 'subagent-review-01',
        prompt: 'Review the PR',
        expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-review' } }
      }
    ]);
    assert.equal(remapped?.expect?.tool, LOAD_SKILL);
  });
});
