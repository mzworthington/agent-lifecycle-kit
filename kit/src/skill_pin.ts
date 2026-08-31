const COMMIT_SHA = /^[0-9a-f]{40}$/i;

/** Lockfile pins that mean "do not pass --pin": gh skill then uses latest tagged release, else HEAD. */
export function isLatestSkillPin(pin: string): boolean {
  const trimmed = pin.trim();
  return trimmed === '' || trimmed === '*' || trimmed.toLowerCase() === 'latest';
}

/**
 * Map a lockfile pin to `gh skill install --pin` args.
 *
 * Version tags must be fully qualified (`refs/tags/v1.0.0`). A bare `v1.0.0`
 * makes gh skill fall through to GET /commits/v1.0.0, which 422s
 * ("No commit found for SHA") when the tag does not exist.
 */
export function ghSkillPinArgs(pin: string): string[] {
  const trimmed = pin.trim();
  if (isLatestSkillPin(trimmed)) return [];
  if (COMMIT_SHA.test(trimmed) || trimmed.startsWith('refs/')) {
    return ['--pin', trimmed];
  }
  return ['--pin', `refs/tags/${trimmed}`];
}
