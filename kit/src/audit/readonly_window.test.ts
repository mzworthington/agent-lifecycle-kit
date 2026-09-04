import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  READONLY_AUDIT_SKILLS,
  auditHonestyOutcome,
  auditToolCallArguments,
  buildAuditLaunchArgs,
  extractHandoverPath,
  isReadonlyAuditSkill
} from './readonly_window.js';

describe('readonly audit window', () => {
  it('classifies review, security, and arch-drift as readonly auditors', () => {
    assert.deepEqual([...READONLY_AUDIT_SKILLS].sort(), [
      'agent-arch-drift',
      'agent-review',
      'agent-security'
    ]);
    assert.equal(isReadonlyAuditSkill('agent-review'), true);
    assert.equal(isReadonlyAuditSkill('agent-tdd'), false);
  });

  it('launches auditors with readonly true and handover/diff paths only', () => {
    const args = buildAuditLaunchArgs({
      specialist: 'agent-review',
      handoverPath: 'handover/demo/handover_tdd.md',
      diffRef: 'origin/main...HEAD'
    });
    assert.deepEqual(args, {
      specialist: 'agent-review',
      class: 'review',
      readonly: true,
      handoverPath: 'handover/demo/handover_tdd.md',
      diffRef: 'origin/main...HEAD'
    });
    assert.equal('transcript' in args, false);
    assert.equal('chatHistory' in args, false);
    const toolArgs = auditToolCallArguments({
      specialist: 'agent-review',
      handoverPath: 'handover/demo/handover_tdd.md',
      diffRef: 'origin/main...HEAD'
    });
    assert.equal(toolArgs.readonly, true);
    assert.equal('transcript' in toolArgs, false);
  });

  it('rejects a non-audit specialist and any implementation transcript', () => {
    assert.throws(
      () => buildAuditLaunchArgs({ specialist: 'agent-tdd', handoverPath: 'handover/demo/handover_tdd.md' }),
      /not a readonly audit/
    );
    assert.throws(
      () =>
        buildAuditLaunchArgs({
          specialist: 'agent-security',
          handoverPath: 'handover/demo/handover_tdd.md',
          transcript: 'we just rewrote the tests to go green'
        }),
      /implementation transcript/
    );
  });

  it('maps catalog and XFN honesty fails to BLOCKED, never a silent pass', () => {
    assert.deepEqual(auditHonestyOutcome('catalog'), { status: 'BLOCKED', nextAgent: 'agent-tdd' });
    assert.deepEqual(auditHonestyOutcome('xfn'), { status: 'BLOCKED', nextAgent: 'agent-xfn' });
  });

  it('extracts a handover path from the parent prompt', () => {
    assert.equal(
      extractHandoverPath('TDD finished. Review this PR. Handover path handover/demo/handover_tdd.md'),
      'handover/demo/handover_tdd.md'
    );
    assert.equal(extractHandoverPath('Review the PR with no handover file named'), undefined);
  });
});
