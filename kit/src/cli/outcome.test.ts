import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cliOutcomeExit,
  cliOutcomeFromOk,
  cliOutcomeShouldColor,
  formatCliOutcome,
  printCliOutcome,
  stripAnsi
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

  it('colors only the outcome token', () => {
    const ok = formatCliOutcome('ok', 'version', 'current', { color: true });
    const warn = formatCliOutcome('warn', 'eval miss-rate', 'not-enough', { color: true });
    const fail = formatCliOutcome('fail', 'check', 'audit', { color: true });
    assert.equal(stripAnsi(ok), 'ok    version  current');
    assert.equal(stripAnsi(warn), 'warn  eval miss-rate  not-enough');
    assert.equal(stripAnsi(fail), 'fail  check  audit');
    assert.match(ok, /^\x1b\[32mok {2}\x1b\[0m  version  current$/);
    assert.match(warn, /^\x1b\[38;5;208mwarn\x1b\[0m  eval miss-rate  not-enough$/);
    assert.match(fail, /^\x1b\[31mfail\x1b\[0m  check  audit$/);
  });
});

describe('cliOutcomeShouldColor', () => {
  it('honors NO_COLOR, FORCE_COLOR, and TTY', () => {
    assert.equal(cliOutcomeShouldColor({ NO_COLOR: '1' }, { isTTY: true }), false);
    assert.equal(cliOutcomeShouldColor({ FORCE_COLOR: '0' }, { isTTY: true }), false);
    assert.equal(cliOutcomeShouldColor({ FORCE_COLOR: '1' }, { isTTY: false }), true);
    assert.equal(cliOutcomeShouldColor({}, { isTTY: true }), true);
    assert.equal(cliOutcomeShouldColor({}, { isTTY: false }), false);
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
    const io = { log: (m: string) => logs.push(m), error: (m: string) => errors.push(m), color: false };
    printCliOutcome('ok', 'align', 'handshake', io);
    printCliOutcome('warn', 'version', 'stale', io);
    printCliOutcome('fail', 'check', 'audit', io);
    assert.deepEqual(logs, ['ok    align  handshake', 'warn  version  stale']);
    assert.deepEqual(errors, ['fail  check  audit']);
  });
});
