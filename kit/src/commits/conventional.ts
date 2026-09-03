const TYPES = 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert';
const SUBJECT_RE = new RegExp(
  `^(${TYPES})(\\([a-z0-9][a-z0-9._/-]*\\))?(!)?: [a-z0-9].*$`
);
const MAX_SUBJECT = 100;
const SCISSORS = /^# .* >8 /;

export const CONVENTIONAL_COMMIT_USAGE =
  'type(optional-scope): description — types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert';

export function extractCommitSubject(raw: string): string {
  const lines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (SCISSORS.test(line)) break;
    if (line.startsWith('#')) continue;
    lines.push(line);
  }
  return lines.find((line) => line.trim() !== '') ?? '';
}

export function validateConventionalCommit(raw: string): { ok: true } | { ok: false; error: string } {
  const subject = extractCommitSubject(raw);
  if (!subject) {
    return { ok: false, error: `Not a conventional commit: empty subject. Use ${CONVENTIONAL_COMMIT_USAGE}` };
  }
  if (subject.startsWith('Merge ') || subject.startsWith('Revert "')) {
    return { ok: true };
  }
  if (subject.length > MAX_SUBJECT) {
    return {
      ok: false,
      error: `Not a conventional commit: subject exceeds ${MAX_SUBJECT} characters`
    };
  }
  if (subject.endsWith('.')) {
    return {
      ok: false,
      error: `Not a conventional commit: subject must not end with a period. Use ${CONVENTIONAL_COMMIT_USAGE}`
    };
  }
  if (!SUBJECT_RE.test(subject)) {
    return { ok: false, error: `Not a conventional commit: ${JSON.stringify(subject)}. Use ${CONVENTIONAL_COMMIT_USAGE}` };
  }
  return { ok: true };
}
