import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  outcomeFromTestEvent,
  relativizeTestFile,
  renderUnitTestReportMarkdown,
  summarizeUnitTests
} from './unit_test_report.mjs';

describe('unit test report helpers', () => {
  it('relativizes absolute paths', () => {
    const abs = `${process.cwd()}/kit/src/foo.test.ts`;
    assert.equal(relativizeTestFile(abs), 'kit/src/foo.test.ts');
    assert.equal(relativizeTestFile('already/relative.ts'), 'already/relative.ts');
  });

  it('ignores suite rollups and maps leaf outcomes', () => {
    assert.equal(
      outcomeFromTestEvent({
        type: 'test:fail',
        data: { details: { type: 'suite', error: { failureType: 'subtestsFailed' } } }
      }),
      null
    );
    assert.equal(
      outcomeFromTestEvent({
        type: 'test:pass',
        data: { skip: true, details: {} }
      }),
      'skip'
    );
    assert.equal(
      outcomeFromTestEvent({
        type: 'test:fail',
        data: { details: { error: { failureType: 'testCodeFailure' } } }
      }),
      'fail'
    );
    assert.equal(outcomeFromTestEvent({ type: 'test:pass', data: { details: {} } }), 'pass');
  });

  it('renders a markdown summary with failures expanded', () => {
    const md = renderUnitTestReportMarkdown([
      {
        name: 'ok',
        file: 'kit/src/a.test.ts',
        outcome: 'pass',
        durationMs: 1.2
      },
      {
        name: 'broken',
        file: 'kit/src/b.test.ts',
        outcome: 'fail',
        durationMs: 3.4,
        errorMessage: 'Expected 1 === 2'
      },
      {
        name: 'later',
        file: 'kit/src/a.test.ts',
        outcome: 'skip',
        durationMs: 0.1
      }
    ]);
    assert.match(md, /Unit tests/);
    assert.match(md, /FAILED/);
    assert.match(md, /1 passed, 1 failed, 1 skipped/);
    assert.match(md, /### Failures/);
    assert.match(md, /broken/);
    assert.match(md, /Expected 1 === 2/);
    assert.match(md, /All test cases/);
    const stats = summarizeUnitTests([
      { name: 'a', file: 'f', outcome: 'pass', durationMs: 1 },
      { name: 'b', file: 'f', outcome: 'fail', durationMs: 2 }
    ]);
    assert.equal(stats.total, 2);
    assert.equal(stats.failed, 1);
    assert.equal(stats.passed, 1);
  });
});
