import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  analyticsFilePath,
  loadAnalytics,
  recordHandoverEvent,
  renderAnalyticsSummary
} from './telemetry_analytics.js';

describe('handover analytics', () => {
  it('returns empty analytics when the file is missing or corrupt', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const empty = loadAnalytics(home);
    assert.equal(empty.totalHandovers, 0);
    assert.deepEqual(empty.history, []);

    fs.mkdirSync(path.dirname(analyticsFilePath(home)), { recursive: true });
    fs.writeFileSync(analyticsFilePath(home), '{not json', 'utf8');
    const recovered = loadAnalytics(home);
    assert.equal(recovered.totalHandovers, 0);
  });

  it('records pass/fail counts and caps history at 100', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    recordHandoverEvent({ phase: 'tdd', status: 'passed', project: 'kit' }, home);
    recordHandoverEvent({ phase: 'tdd', status: 'failed', notes: 'red' }, home);
    recordHandoverEvent({ phase: 'xfn', status: 'in_progress' }, home);
    const data = loadAnalytics(home);
    assert.equal(data.totalHandovers, 3);
    assert.deepEqual(data.phases.tdd, { passed: 1, failed: 1 });
    assert.deepEqual(data.phases.xfn, { passed: 0, failed: 0 });
    assert.equal(data.history[0]?.status, 'in_progress');

    for (let i = 0; i < 120; i++) {
      recordHandoverEvent({ phase: 'tdd', status: 'passed' }, home);
    }
    assert.equal(loadAnalytics(home).history.length, 100);
  });

  it('renders a summary without throwing', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    recordHandoverEvent(
      { phase: 'tdd', status: 'passed', project: 'kit', timestamp: '2026-08-31T00:00:00.000Z' },
      home
    );
    renderAnalyticsSummary(home);
  });
});
