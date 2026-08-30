import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EvalRunner } from './runner.js';
import { loadDataset, productionTraceToJsonl } from './dataset.js';
import { detectRoutingDrift, shouldShadowEval } from './otel.js';
import { localJudge } from './judge.js';
import { generateReport } from './telemetry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(here, '../../..');

describe('EDD EvalRunner', () => {
  it('passes architecture routing suite with scripted model', async () => {
    const runner = new EvalRunner({
      model: 'scripted',
      systemPromptPath: path.join(repoDir, 'evals/edd/system_prompt.md')
    });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_routing.yaml'));
    assert.equal(report.failed, 0, report.results.filter((r) => !r.passed).map((r) => r.failures.join(',')).join(' | '));
    assert.ok(report.routingAccuracy >= 95);
  });

  it('passes self-correction suite', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(
      path.join(repoDir, 'evals/edd/architecture_self_correction.yaml')
    );
    assert.equal(report.failed, 0);
  });

  it('passes terminal fallback suite', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_terminal.yaml'));
    assert.equal(report.failed, 0);
  });

  it('streams JSONL datasets', async () => {
    const cases = await loadDataset(path.join(repoDir, 'evals/edd/architecture_routing.jsonl'), [
      'routing'
    ]);
    assert.ok(cases.length >= 2);
    assert.ok(cases.every((c) => c.id && c.prompt));
  });

  it('converts production traces to JSONL', () => {
    const line = productionTraceToJsonl({
      id: 'prod-001',
      prompt: 'Show payment architecture',
      reason: 'circuit_breaker',
      history: [{ role: 'tool', content: '{"error":"Timeout"}' }]
    });
    const parsed = JSON.parse(line) as { tags: string[] };
    assert.ok(parsed.tags.includes('prod-derived'));
    assert.ok(parsed.tags.includes('circuit_breaker'));
  });

  it('detects routing drift', () => {
    const result = detectRoutingDrift({
      baseline: { version: '1.0', toolCounts: { read_architecture_yaml: 30, other: 70 } },
      current: { version: '1.1', toolCounts: { read_architecture_yaml: 2, other: 98 } },
      tool: 'read_architecture_yaml'
    });
    assert.equal(result.drifted, true);
  });

  it('samples shadow evals at ~5%', () => {
    let hits = 0;
    const n = 2000;
    let i = 0;
    const seq = Array.from({ length: n }, (_, idx) => idx / n);
    for (let k = 0; k < n; k++) {
      if (shouldShadowEval(0.05, () => seq[i++]!)) hits++;
    }
    assert.ok(hits >= 80 && hits <= 120, `hits=${hits}`);
  });

  it('local judge flags hallucinations', () => {
    const verdict = localJudge({
      prompt: 'Summarize architecture',
      toolOutput: { component: 'payment-api' },
      agentResponse: 'payment-api talks to the legacy-monolith and redis cluster'
    });
    assert.equal(verdict.score, 'FAIL');
    assert.equal(verdict.hallucinated, true);
  });

  it('writes markdown evaluation reports', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_routing.yaml'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edd-report-'));
    const written = generateReport([report], { format: 'md', outDir: dir });
    assert.ok(written.some((p) => p.endsWith('edd-report.md')));
    assert.ok(written.some((p) => p.endsWith('eval-report.md')));
    const md = fs.readFileSync(path.join(dir, 'eval-report.md'), 'utf8');
    assert.match(md, /Agent Eval Report:/);
    assert.match(md, /Routing Accuracy/);
    assert.match(md, /Schema Adherence/);
    assert.match(md, /Failure Traces/);
  });

  it('renders failure traces with diagnosis and suggested fix', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edd-fail-'));
    const written = generateReport(
      [
        {
          suite: 'Architecture Routing',
          suitePath: '/tmp/suite.yaml',
          model: 'claude-3-5-sonnet-latest',
          startedAt: '2026-08-30T00:00:00.000Z',
          finishedAt: '2026-08-30T00:01:00.000Z',
          total: 2,
          passed: 0,
          failed: 2,
          routingAccuracy: 0,
          schemaAdherence: 50,
          hallucinationRate: 0,
          totalTokens: 200,
          avgLatencyMs: 840,
          results: [
            {
              id: 'route-08',
              prompt: 'What is the database for the payment system?',
              passed: false,
              latencyMs: 800,
              tokens: 100,
              failures: ['routing: expected tool read_architecture_yaml, got (none)'],
              tags: ['edge-case', 'routing'],
              routingOk: false,
              trace: {
                diagnosis:
                  'Tool Selection Failure. The model refused to use the tool and hallucinated a generic answer.',
                suggestedFix:
                  'Add a constraint to the system prompt instructing the agent to never guess architectural details and to always use the provided C4 tools.',
                expectedTool: 'read_architecture_yaml',
                llmOutput:
                  "I don't have access to your database, but typically payment systems use PostgreSQL..."
              }
            },
            {
              id: 'schema-03',
              prompt: 'Check the architecture for the auth service and the payment api.',
              passed: false,
              latencyMs: 880,
              tokens: 100,
              failures: ['schema: expected componentId to be a string, got array'],
              tags: ['extraction', 'schema'],
              schemaOk: false,
              trace: {
                diagnosis:
                  'Schema Violation. The tool only accepts a string, but the model attempted to pass an array to handle the multi-intent prompt.',
                suggestedFix:
                  "Update the tool description to explicitly state that it can only be called for one component at a time, or update the tool's backend logic to accept arrays.",
                expectedArguments: '{"componentId":"auth-service"}',
                actualArguments: '{"componentId":["auth-service","payment-api"]}'
              }
            }
          ]
        }
      ],
      { format: 'md', outDir: dir }
    );
    const md = fs.readFileSync(written.find((p) => p.endsWith('eval-report.md'))!, 'utf8');
    assert.match(md, /Test ID: `route-08`/);
    assert.match(md, /Test ID: `schema-03`/);
    assert.match(md, /Tool Selection Failure/);
    assert.match(md, /Schema Violation/);
    assert.match(md, /Suggested Fix/);
  });

  it('skips requires-live cases when using the scripted driver', async () => {
    const all = await loadDataset(path.join(repoDir, 'evals/edd/architecture_routing.jsonl'));
    assert.ok(all.some((c) => c.tags?.includes('requires-live')));
    const runner = new EvalRunner({
      model: 'scripted',
      systemPromptPath: path.join(repoDir, 'evals/edd/system_prompt.md')
    });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_routing.yaml'));
    assert.equal(report.failed, 0, report.results.filter((r) => !r.passed).map((r) => r.failures.join(',')).join(' | '));
    assert.ok(report.results.some((r) => r.id === 'inject-01'));
    assert.ok(!report.results.some((r) => r.id === 'schema-04'));
    assert.ok(!report.results.some((r) => (r.tags ?? []).includes('requires-live')));
  });

  it('excludes requires-live tags from loadDataset', async () => {
    const cases = await loadDataset(
      path.join(repoDir, 'evals/edd/architecture_routing.jsonl'),
      undefined,
      ['requires-live']
    );
    assert.ok(cases.every((c) => !(c.tags ?? []).includes('requires-live')));
    assert.ok(cases.some((c) => c.id === 'inject-01'));
  });

  it('asserts ordered expect.tools calls', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edd-tools-'));
    fs.writeFileSync(
      path.join(dir, 'cases.jsonl'),
      `${JSON.stringify({
        id: 'multi-01',
        prompt: 'lookup both',
        tags: ['routing'],
        expect: {
          tools: [
            { name: 'read_architecture_yaml', arguments_contains: { componentId: 'auth-service' } },
            { name: 'read_architecture_yaml', arguments_contains: { componentId: 'payment-api' } }
          ]
        }
      })}\n`
    );
    fs.writeFileSync(
      path.join(dir, 'suite.yaml'),
      `name: "Multi-tool"
dataset: "cases.jsonl"
metrics:
  - type: "tool_selection"
  - type: "schema_match"
    strict: true
`
    );
    const runner = new EvalRunner({
      model: 'scripted',
      driver: async () => ({
        content: 'Looked up both components.',
        tool_calls: [
          { name: 'read_architecture_yaml', arguments: { componentId: 'auth-service' } },
          { name: 'read_architecture_yaml', arguments: { componentId: 'payment-api' } }
        ],
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
      })
    });
    const report = await runner.runSuite(path.join(dir, 'suite.yaml'));
    assert.equal(report.failed, 0, report.results[0]?.failures.join(','));
    assert.equal(report.results[0]?.routingOk, true);
    assert.equal(report.results[0]?.schemaOk, true);
  });

  it('passes kit-knowledge suite with scripted model', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/kit_knowledge.yaml'));
    assert.equal(report.failed, 0, report.results.filter((r) => !r.passed).map((r) => `${r.id}: ${r.failures.join(',')}`).join(' | '));
    assert.ok(!report.results.some((r) => r.id === 'kit-live-01'));
  });

  it('loads a prod-derived circuit-breaker case', async () => {
    const cases = await loadDataset(path.join(repoDir, 'evals/edd/architecture_terminal.jsonl'), [
      'prod-derived'
    ]);
    assert.equal(cases.length, 1);
    assert.equal(cases[0]?.id, 'prod-cb-01');
    assert.equal(cases[0]?.expect?.no_tool, true);
  });

  it('round-trips the prod-trace example through productionTraceToJsonl', () => {
    const fixturePath = path.join(repoDir, 'evals/edd/examples/prod-trace.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
      id: string;
      prompt: string;
      reason: 'circuit_breaker';
      history: unknown[];
      expect: { no_tool: boolean };
    };
    const line = productionTraceToJsonl({
      id: fixture.id,
      prompt: fixture.prompt,
      reason: fixture.reason,
      history: fixture.history as never,
      expect: fixture.expect
    });
    const parsed = JSON.parse(line) as { tags: string[]; expect?: { no_tool?: boolean } };
    assert.ok(parsed.tags.includes('prod-derived'));
    assert.ok(parsed.tags.includes('circuit_breaker'));
    assert.equal(parsed.expect?.no_tool, true);
  });
});
