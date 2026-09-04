/** Operator switch: stay in the parent chat and load role SKILL.md. Default is launch. */
export const SKILLS_ONLY_ENV = 'KIT_SKILLS_ONLY';

const TRUTHY = new Set(['1', 'true', 'on', 'yes']);
const FALSY = new Set(['', '0', 'false', 'off', 'no']);

export function isSkillsOnlyMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[SKILLS_ONLY_ENV];
  if (raw === undefined) return false;
  const value = raw.trim().toLowerCase();
  if (FALSY.has(value)) return false;
  return TRUTHY.has(value);
}
