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

export function handoverDir(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.agents', 'handover');
}

export function analyticsFilePath(homeDir: string = os.homedir()): string {
  return path.join(handoverDir(homeDir), 'analytics.json');
}

function ensureDirectoryExists(homeDir: string): void {
  const dir = handoverDir(homeDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function emptyAnalytics(): AnalyticsData {
  return {
    totalHandovers: 0,
    lastUpdated: new Date().toISOString(),
    phases: {},
    history: []
  };
}

export function loadAnalytics(homeDir: string = os.homedir()): AnalyticsData {
  ensureDirectoryExists(homeDir);
  const analyticsFile = analyticsFilePath(homeDir);
  if (!fs.existsSync(analyticsFile)) {
    return emptyAnalytics();
  }
  try {
    const raw = fs.readFileSync(analyticsFile, 'utf8');
    return JSON.parse(raw) as AnalyticsData;
  } catch {
    return emptyAnalytics();
  }
}

export function recordHandoverEvent(event: HandoverEvent, homeDir: string = os.homedir()): void {
  const data = loadAnalytics(homeDir);
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

  if (data.history.length > 100) {
    data.history = data.history.slice(0, 100);
  }

  ensureDirectoryExists(homeDir);
  fs.writeFileSync(analyticsFilePath(homeDir), JSON.stringify(data, null, 2), 'utf8');
}

export function renderAnalyticsSummary(homeDir: string = os.homedir()): void {
  const data = loadAnalytics(homeDir);
  const analyticsFile = analyticsFilePath(homeDir);

  console.log('=== Agent Handover & Telemetry Analytics ===');
  console.log(`Analytics Log: ${analyticsFile}`);
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
      console.log(
        `  - Phase [${phase.padEnd(14)}]: ${counts.passed} passed, ${counts.failed} failed (${rate}% success rate)`
      );
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
