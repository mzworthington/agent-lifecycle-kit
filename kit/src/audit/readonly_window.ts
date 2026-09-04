export const READONLY_AUDIT_SKILLS = ['agent-review', 'agent-security', 'agent-arch-drift'] as const;

export type ReadonlyAuditSkill = (typeof READONLY_AUDIT_SKILLS)[number];

export interface AuditLaunchInput {
  specialist: string;
  handoverPath?: string;
  diffRef?: string;
  transcript?: unknown;
  chatHistory?: unknown;
}

export interface AuditLaunchArgs {
  specialist: ReadonlyAuditSkill;
  class: 'review';
  readonly: true;
  handoverPath?: string;
  diffRef?: string;
}

export type AuditHonestyFail = 'catalog' | 'xfn';

export interface AuditHonestyOutcome {
  status: 'BLOCKED';
  nextAgent: 'agent-tdd' | 'agent-xfn';
}

export const AUDIT_STUB_ISOLATION_LINES = [
  'This window is `readonly: true`: do not edit product files or run state-changing shell.',
  'The parent passes diff/PR refs and handover paths only. Do not receive the implementation chat.',
  'Catalog or XFN honesty fail → Status BLOCKED, Next agent agent-tdd or agent-xfn. Never a silent pass.',
  'Return Status and Next agent. The parent writes handover_audit.md.'
] as const;

export function isReadonlyAuditSkill(name: string): name is ReadonlyAuditSkill {
  return (READONLY_AUDIT_SKILLS as readonly string[]).includes(name);
}

export function buildAuditLaunchArgs(input: AuditLaunchInput): AuditLaunchArgs {
  if (!isReadonlyAuditSkill(input.specialist)) {
    throw new Error(`${input.specialist} is not a readonly audit subagent`);
  }
  if (input.transcript != null || input.chatHistory != null) {
    throw new Error('Audit subagent must not receive the implementation transcript');
  }
  const args: AuditLaunchArgs = {
    specialist: input.specialist,
    class: 'review',
    readonly: true
  };
  if (input.handoverPath) args.handoverPath = input.handoverPath;
  if (input.diffRef) args.diffRef = input.diffRef;
  return args;
}

/** Tool-call payload: a string-indexable record (AuditLaunchArgs is a closed interface). */
export function auditToolCallArguments(input: AuditLaunchInput): Record<string, unknown> {
  const args = buildAuditLaunchArgs(input);
  const out: Record<string, unknown> = {
    specialist: args.specialist,
    class: args.class,
    readonly: args.readonly
  };
  if (args.handoverPath) out.handoverPath = args.handoverPath;
  if (args.diffRef) out.diffRef = args.diffRef;
  return out;
}

export function auditHonestyOutcome(fail: AuditHonestyFail): AuditHonestyOutcome {
  return {
    status: 'BLOCKED',
    nextAgent: fail === 'xfn' ? 'agent-xfn' : 'agent-tdd'
  };
}

export function extractHandoverPath(prompt: string): string | undefined {
  const match = prompt.match(/handover\/[\w./-]+\.md/i);
  return match?.[0];
}
