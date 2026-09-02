import { describe, expect, it } from 'vitest';
import todayMd from '../../../docs/today-jobs.md?raw';
import { parseTodayJobsMarkdown } from './todayJobs.ts';

describe('parseTodayJobsMarkdown', () => {
  it('parses id, title, blurb, why, steps, command, and actions', () => {
    const md = `# Jobs

## demo | Demo job

> Button blurb with \`kit\`.

Why this path exists.

1. **Write** the case.
2. **Run** \`kit eval run\`
3. Done.

\`\`\`
kit eval run
\`\`\`

- [Proof](#proof)
- [Suite](./evals/edd/demo.yaml)
`;
    const jobs = parseTodayJobsMarkdown(md);
    expect(jobs).toEqual([
      {
        id: 'demo',
        title: 'Demo job',
        blurb: 'Button blurb with `kit`.',
        why: 'Why this path exists.',
        steps: ['**Write** the case.', '**Run** `kit eval run`', 'Done.'],
        cmd: 'kit eval run',
        actions: [
          { label: 'Proof', href: '#proof' },
          { label: 'Suite', href: './evals/edd/demo.yaml' }
        ]
      }
    ]);
  });

  it('skips headings without an id pipe', () => {
    expect(parseTodayJobsMarkdown('## Just a title\n\nNope.\n')).toEqual([]);
  });
});

describe('docs/today-jobs.md', () => {
  it('is the source for the five landing-page jobs', () => {
    const jobs = parseTodayJobsMarkdown(todayMd);
    expect(jobs.map((job) => job.id)).toEqual([
      'wrong-tool',
      'ci-gate',
      'context',
      'feature',
      'first-hour'
    ]);
    const wrongTool = jobs[0]!;
    expect(wrongTool.title).toBe('Wrong tool or made-up args');
    expect(wrongTool.blurb).toMatch(/guessed architecture/);
    expect(wrongTool.why).toMatch(/JSONL/);
    expect(wrongTool.steps).toHaveLength(3);
    expect(wrongTool.cmd).toBe('kit eval run --suite evals/edd/demo.yaml --model scripted');
    expect(wrongTool.actions[0]?.href).toBe('/#proof');
    expect(jobs.every((job) => job.cmd.length > 0 && job.actions.length === 3)).toBe(true);
  });
});
