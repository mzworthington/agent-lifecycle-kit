import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createConsoleEvalProgress,
  evalDriverKind,
  formatCaseDone,
  formatCasePhase,
  formatSuiteStart
} from './progress.js';

describe('EDD eval progress', () => {
  it('labels scripted vs live from model and key', () => {
    assert.equal(evalDriverKind('scripted'), 'scripted');
    assert.equal(evalDriverKind('gemini-2.5-flash'), 'scripted');
    assert.equal(evalDriverKind('gemini-2.5-flash', 'AIza'), 'live');
  });

  it('formats a live suite start with base URL and hang hint', () => {
    const lines = formatSuiteStart({
      driver: 'live',
      model: 'gemini-2.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      caseCount: 12,
      skippedLive: 0
    });
    assert.match(lines[0] ?? '', /Eval driver: live/);
    assert.match(lines[0] ?? '', /model=gemini-2.5-flash/);
    assert.match(lines[0] ?? '', /base=https:\/\/generativelanguage.googleapis.com\/v1beta\/openai/);
    assert.equal(lines[1], 'Cases: 12');
    assert.match(lines[2] ?? '', /pause after "agent"/);
  });

  it('formats scripted suite start without a hang hint', () => {
    const lines = formatSuiteStart({
      driver: 'scripted',
      model: 'scripted',
      caseCount: 9,
      skippedLive: 3
    });
    assert.equal(lines[0], 'Eval driver: scripted  model=scripted');
    assert.equal(lines[1], 'Cases: 9 (3 requires-live skipped)');
    assert.equal(lines.length, 2);
  });

  it('formats per-case phase and result lines', () => {
    assert.equal(
      formatCasePhase({ index: 1, total: 12, id: 'route-01', phase: 'agent' }),
      '  [1/12] route-01  agent…'
    );
    assert.equal(
      formatCasePhase({ index: 1, total: 12, id: 'route-01', phase: 'judges' }),
      '  [1/12] route-01  judges…'
    );
    assert.equal(
      formatCaseDone({
        index: 1,
        total: 12,
        id: 'route-01',
        passed: true,
        agentMs: 1842.4,
        totalMs: 4200.1
      }),
      '  ✓ [1/12] route-01  agent 1842ms  total 4200ms'
    );
    assert.match(
      formatCaseDone({
        index: 2,
        total: 12,
        id: 'ignore-01',
        passed: false,
        agentMs: 10,
        totalMs: 11
      }),
      /✗ \[2\/12\] ignore-01/
    );
  });

  it('console adapter emits formatter lines in order', () => {
    const lines: string[] = [];
    const progress = createConsoleEvalProgress((msg) => lines.push(msg));
    progress.onSuiteStart({
      driver: 'scripted',
      model: 'scripted',
      caseCount: 1,
      skippedLive: 0
    });
    progress.onCasePhase({ index: 1, total: 1, id: 'mini-01', phase: 'agent' });
    progress.onCaseDone({
      index: 1,
      total: 1,
      id: 'mini-01',
      passed: true,
      agentMs: 1,
      totalMs: 2
    });
    assert.deepEqual(lines, [
      'Eval driver: scripted  model=scripted',
      'Cases: 1',
      '  [1/1] mini-01  agent…',
      '  ✓ [1/1] mini-01  agent 1ms  total 2ms'
    ]);
  });
});
