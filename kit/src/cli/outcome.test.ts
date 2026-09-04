import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cliOutcomeExit,
  cliOutcomeFromOk,
  formatCliOutcome,
  printCliOutcome
} from './outcome.js';

describe('formatCliOutcome', () => {
  it('pads ok/warn/fail so the command column lines up', () => {
    assert.equal(formatCliOutcome('ok', 'version', '~/.agents points at this clone'), 'ok    version  ~/.agents points at this clone');
    assert.equal(
      formatCliOutcome('warn', 'eval miss-rate', 'not-enough'),
      'warn  eval miss-rate  not-enough'
    );
    assert.equal(formatCliOutcome('fail', 'ontology check', 'broken refs'), 'fail  ontology check  broken refs');
  });
});

describe('cliOutcomeExit', () => {
  it('fails the process only on fail', () => {
    assert.equal(cliOutcomeExit('ok'), 0);
    assert.equal(cliOutcomeExit('warn'), 0);
    assert.equal(cliOutcomeExit('fail'), 1);
    assert.equal(cliOutcomeFromOk(true), 'ok');
    assert.equal(cliOutcomeFromOk(false), 'fail');
  });
});

describe('printCliOutcome', () => {
  it('writes fail to error and ok/warn to log', () => {
    const logs: string[] = [];
    const errors: string[] = [];
    printCliOutcome('ok', 'align', 'handshake', { log: (m) => logs.push(m), error: (m) => errors.push(m) });
    printCliOutcome('warn', 'version', 'stale', { log: (m) => logs.push(m), error: (m) => errors.push(m) });
    printCliOutcome('fail', 'check', 'audit', { log: (m) => logs.push(m), error: (m) => errors.push(m) });
    assert.deepEqual(logs, ['ok    align  handshake', 'warn  version  stale']);
    assert.deepEqual(errors, ['fail  check  audit']);
  });
});
