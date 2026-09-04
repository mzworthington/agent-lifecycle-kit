import type { CaseExpect, EvalCase, EvalConfig } from './schema.js';

export const LAUNCH_SPECIALIST = 'launch_specialist';
export const LOAD_SKILL = 'load_skill';
export const LOAD_SKILL_TOOL_FILE = 'tools/load_skill.json';
export const SKILLS_ONLY_PROMPT_FILE = 'subagent_routing_skills_only_prompt.md';

export interface SpecialistMatch {
  specialist: string;
  class?: 'plan' | 'review' | 'implement' | 'cheap';
  handoverPaths?: string[];
  content: string;
}

function includesAll(prompt: string, ...needles: string[]): boolean {
  return needles.every((needle) => prompt.includes(needle));
}

/** Keyword match used by the local driver. Live cases must not rely on this. */
export function matchHostSpecialist(promptRaw: string): SpecialistMatch | null {
  const prompt = promptRaw.toLowerCase();
  if (prompt.includes('weather') || prompt.includes('brew coffee') || prompt.includes('make tea')) {
    return null;
  }
  if (prompt.includes('typo')) {
    return null;
  }
  if (prompt.includes('owasp') || prompt.includes('security audit')) {
    return {
      specialist: 'agent-security',
      class: 'review',
      handoverPaths: ['handover/demo/handover_tdd.md'],
      content: 'agent-security'
    };
  }
  if (
    prompt.includes('pr') &&
    (prompt.includes('review') || prompt.includes('audit') || prompt.includes('independent'))
  ) {
    return {
      specialist: 'agent-review',
      class: 'review',
      handoverPaths: ['handover/demo/handover_tdd.md'],
      content: 'agent-review'
    };
  }
  if (
    prompt.includes('ci failed') ||
    prompt.includes('failed github actions') ||
    prompt.includes('failed job')
  ) {
    return { specialist: 'agent-debug', content: 'agent-debug' };
  }
  if (
    prompt.includes('browser e2e') ||
    prompt.includes('xfn apply') ||
    prompt.includes('green the browser')
  ) {
    return {
      specialist: 'agent-xfn',
      handoverPaths: ['handover/demo/handover_xfn.md'],
      content: 'agent-xfn'
    };
  }
  if (
    (includesAll(prompt, 'spec handover is complete') || includesAll(prompt, 'spec is complete')) &&
    (prompt.includes('tdd') || prompt.includes('short loop'))
  ) {
    return {
      specialist: 'agent-tdd',
      class: 'implement',
      handoverPaths: ['handover/demo/handover_spec.md'],
      content: 'agent-tdd'
    };
  }
  if (
    (prompt.includes('draft the spec') ||
      prompt.includes('write the specification') ||
      prompt.includes('sequential spec')) &&
    !prompt.includes('handover is complete') &&
    !prompt.includes('spec is complete')
  ) {
    return {
      specialist: 'agent-spec',
      class: 'plan',
      handoverPaths: ['handover/demo/handover_stories.md'],
      content: 'agent-spec'
    };
  }
  return null;
}

export function specialistToolName(skillsOnly: boolean): typeof LAUNCH_SPECIALIST | typeof LOAD_SKILL {
  return skillsOnly ? LOAD_SKILL : LAUNCH_SPECIALIST;
}

export function remapLaunchExpectToLoadSkill(expect: CaseExpect): CaseExpect {
  if (expect.tool === LAUNCH_SPECIALIST) {
    return { ...expect, tool: LOAD_SKILL };
  }
  if (expect.tools?.some((call) => call.name === LAUNCH_SPECIALIST)) {
    return {
      ...expect,
      tools: expect.tools.map((call) =>
        call.name === LAUNCH_SPECIALIST ? { ...call, name: LOAD_SKILL } : call
      )
    };
  }
  return expect;
}

export function shouldRemapSubagentExpects(skillsOnly: boolean, mcpTools: string[] = []): boolean {
  return skillsOnly || mcpTools.some((tool) => tool.includes('load_skill'));
}

export function rewriteSubagentSuiteForSkillsOnly(config: EvalConfig): EvalConfig {
  return {
    ...config,
    system_prompt: config.system_prompt?.includes('subagent_routing_prompt.md')
      ? SKILLS_ONLY_PROMPT_FILE
      : config.system_prompt,
    mcp_tools: config.mcp_tools?.map((tool) =>
      tool.includes('launch_specialist') ? LOAD_SKILL_TOOL_FILE : tool
    ),
    mocks: config.mocks?.map((mock) =>
      mock.tool === LAUNCH_SPECIALIST ? { ...mock, tool: LOAD_SKILL } : mock
    )
  };
}

export function applySkillsOnlyCases(cases: EvalCase[]): EvalCase[] {
  return cases.map((testCase) =>
    testCase.expect
      ? { ...testCase, expect: remapLaunchExpectToLoadSkill(testCase.expect) }
      : testCase
  );
}
