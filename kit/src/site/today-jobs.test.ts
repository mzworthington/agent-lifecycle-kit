import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseTodayJobsMarkdown, renderJobInline } from '../../../assets/today-jobs.js';
import { kitRootFrom } from '../shared/paths.js';

const kitRoot = kitRootFrom(import.meta.url);

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
    assert.equal(jobs.length, 1);
    assert.deepEqual(jobs[0], {
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
    });
  });

  it('skips headings without an id pipe', () => {
    const jobs = parseTodayJobsMarkdown('## Just a title\n\nNope.\n');
    assert.deepEqual(jobs, []);
  });
});

describe('renderJobInline', () => {
  it('turns bold and code into the job-panel markup', () => {
    assert.equal(
      renderJobInline('**Run** `kit check` now', 'cli-inline'),
      '<strong>Run</strong> <code class="cli-inline">kit check</code> now'
    );
  });

  it('escapes HTML before formatting', () => {
    assert.equal(renderJobInline('<script>'), '&lt;script&gt;');
  });
});

describe('docs/today-jobs.md', () => {
  it('is the source for the five landing-page jobs', () => {
    const md = fs.readFileSync(path.join(kitRoot, 'docs/today-jobs.md'), 'utf8');
    const jobs = parseTodayJobsMarkdown(md);
    assert.deepEqual(
      jobs.map((job) => job.id),
      ['wrong-tool', 'ci-gate', 'context', 'feature', 'first-hour']
    );
    const wrongTool = jobs[0];
    assert.equal(wrongTool.title, 'Wrong tool or made-up args');
    assert.match(wrongTool.blurb, /guessed architecture/);
    assert.match(wrongTool.why, /JSONL/);
    assert.equal(wrongTool.steps.length, 3);
    assert.equal(wrongTool.cmd, 'kit eval run --suite evals/edd/demo.yaml --model scripted');
    assert.equal(wrongTool.actions[0]?.href, '#proof');
    assert.ok(jobs.every((job) => job.cmd.length > 0 && job.actions.length === 3));
  });
});
