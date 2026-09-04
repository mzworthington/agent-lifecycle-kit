export const LAUNCH_SPECIALIST_TOOL = 'launch_specialist';

export const ALLOWLISTED_SPECIALISTS = [
  'agent-debug',
  'agent-xfn',
  'agent-review',
  'agent-security',
  'agent-arch-drift',
  'agent-spec',
  'agent-tdd'
] as const;

export type AllowlistedSpecialist = (typeof ALLOWLISTED_SPECIALISTS)[number];

const SPECIALIST_CLASS: Partial<Record<AllowlistedSpecialist, 'plan' | 'review' | 'implement' | 'cheap'>> = {
  'agent-review': 'review',
  'agent-security': 'review',
  'agent-arch-drift': 'review',
  'agent-tdd': 'implement',
  'agent-spec': 'plan'
};

export function extractHandoverPaths(prompt: string): string[] {
  const matches = prompt.match(/handover\/[^\s,]+/gi) ?? [];
  return [...new Set(matches)];
}

export function extractLinearId(prompt: string): string | undefined {
  const match = prompt.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  return match?.[1];
}

export function extractNextAgent(prompt: string): string | undefined {
  const match = prompt.match(/next agent[:\s]+(agent-[\w-]+)/i);
  return match?.[1];
}

export function matchAllowlistedSpecialist(prompt: string): AllowlistedSpecialist | null {
  const p = prompt.toLowerCase();
  if (p.includes('weather') || p.includes('brew coffee') || p.includes('make tea')) {
    return null;
  }
  if (p.includes('typo')) {
    return null;
  }
  if (p.includes('owasp') || p.includes('security audit')) {
    return 'agent-security';
  }
  if (p.includes('arch-drift') || p.includes('architecture-drift') || p.includes('hexagonal architecture')) {
    return 'agent-arch-drift';
  }
  if (p.includes('gherkin') || p.includes('sequential spec') || (p.includes('spec specialist') && !p.includes('tdd'))) {
    return 'agent-spec';
  }
  if (
    p.includes('pr') &&
    (p.includes('review') || p.includes('audit') || p.includes('independent'))
  ) {
    return 'agent-review';
  }
  if (p.includes('ci failed') || p.includes('failed github actions') || p.includes('failed job')) {
    return 'agent-debug';
  }
  if (p.includes('browser e2e') || p.includes('xfn apply') || p.includes('green the browser')) {
    return 'agent-xfn';
  }
  if (
    ((p.includes('spec handover is complete') || p.includes('spec is complete') || p.includes('spec is signed off')) &&
      (p.includes('tdd') || p.includes('short loop') || p.includes('adapters'))) ||
    (p.includes('failing tests') && p.includes('adapters'))
  ) {
    return 'agent-tdd';
  }
  return null;
}

export interface ScriptedLaunchArgs {
  specialist: AllowlistedSpecialist;
  class?: 'plan' | 'review' | 'implement' | 'cheap';
  handoverPaths?: string[];
  linearId?: string;
  nextAgent?: string;
  readonly?: boolean;
}

export function launchArgsForPrompt(prompt: string): ScriptedLaunchArgs | null {
  const specialist = matchAllowlistedSpecialist(prompt);
  if (!specialist) return null;
  const args: ScriptedLaunchArgs = { specialist };
  const cls = SPECIALIST_CLASS[specialist];
  if (cls) args.class = cls;
  const handoverPaths = extractHandoverPaths(prompt);
  if (handoverPaths.length) args.handoverPaths = handoverPaths;
  const linearId = extractLinearId(prompt);
  if (linearId) args.linearId = linearId;
  const nextAgent = extractNextAgent(prompt);
  if (nextAgent) args.nextAgent = nextAgent;
  if (specialist === 'agent-review' || specialist === 'agent-security' || specialist === 'agent-arch-drift') {
    args.readonly = true;
  }
  return args;
}

export function skillsOnlyContent(specialist: AllowlistedSpecialist | null): string {
  if (!specialist) {
    return 'Skills-only mode: stay in the parent. Do not launch a host subagent.';
  }
  return `Skills-only mode: load skills/${specialist}/SKILL.md in the parent. Write COMPLETE or BLOCKED to the handover. Do not launch a host subagent.`;
}
