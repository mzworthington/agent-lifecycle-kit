import fs from 'fs';
import path from 'path';
import os from 'os';

export interface HandoverEvent {
  project?: string;
  phase: string;
  status: 'passed' | 'failed' | 'in_progress';
  timestamp?: string;
  notes?: string;
  retries?: number;
}

export interface AnalyticsData {
  totalHandovers: number;
  lastUpdated: string;
  phases: Record<string, { passed: number; failed: number }>;
  history: HandoverEvent[];
}

const HANDOVER_DIR = path.join(os.homedir(), '.agents', 'handover');
const ANALYTICS_FILE = path.join(HANDOVER_DIR, 'analytics.json');

function ensureDirectoryExists(): void {
  if (!fs.existsSync(HANDOVER_DIR)) {
    fs.mkdirSync(HANDOVER_DIR, { recursive: true });
  }
}

export function loadAnalytics(): AnalyticsData {
  ensureDirectoryExists();
  if (!fs.existsSync(ANALYTICS_FILE)) {
    return {
      totalHandovers: 0,
      lastUpdated: new Date().toISOString(),
      phases: {},
      history: []
    };
  }
  try {
    const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      totalHandovers: 0,
      lastUpdated: new Date().toISOString(),
      phases: {},
      history: []
    };
  }
}

export function recordHandoverEvent(event: HandoverEvent): void {
  const data = loadAnalytics();
  data.totalHandovers += 1;
  data.lastUpdated = new Date().toISOString();

  const phase = event.phase || 'unknown';
  if (!data.phases[phase]) {
    data.phases[phase] = { passed: 0, failed: 0 };
  }

  if (event.status === 'passed') {
    data.phases[phase].passed += 1;
  } else if (event.status === 'failed') {
    data.phases[phase].failed += 1;
  }

  data.history.unshift({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });

  // Keep last 100 history items
  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }

  ensureDirectoryExists();
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function renderAnalyticsSummary(): void {
  const data = loadAnalytics();

  console.log('=== Agent Handover & Telemetry Analytics ===');
  console.log(`Analytics Log: ${ANALYTICS_FILE}`);
  console.log(`Total Handover Events Recorded: ${data.totalHandovers}`);
  console.log(`Last Updated: ${data.lastUpdated}`);
  console.log('');

  console.log('--- Phase Pass / Fail Breakdown ---');
  const phaseEntries = Object.entries(data.phases);
  if (phaseEntries.length === 0) {
    console.log('  No phase events recorded yet.');
  } else {
    for (const [phase, counts] of phaseEntries) {
      const total = counts.passed + counts.failed;
      const rate = total > 0 ? ((counts.passed / total) * 100).toFixed(1) : '100.0';
      console.log(`  - Phase [${phase.padEnd(14)}]: ${counts.passed} passed, ${counts.failed} failed (${rate}% success rate)`);
    }
  }

  console.log('');
  console.log('--- Recent Activity (Latest 5) ---');
  if (data.history.length === 0) {
    console.log('  No recent history available.');
  } else {
    data.history.slice(0, 5).forEach((item, idx) => {
      const proj = item.project ? `[${item.project}] ` : '';
      console.log(`  ${idx + 1}. ${proj}${item.phase} - ${item.status.toUpperCase()} (${item.timestamp})`);
      if (item.notes) {
        console.log(`     Notes: ${item.notes}`);
      }
    });
  }

  console.log('\n✅ Telemetry summary displayed successfully.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('telemetry_analytics.ts')) {
  renderAnalyticsSummary();
}
