import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  checkOntology,
  entityId,
  generateOntologyIndex,
  getEntity,
  getRelated,
  loadOntologySchema,
  validateMemoryEntityWrites
} from './index.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('ontology schema', () => {
  it('loads kit ontology/schema.yaml with memory allowlist', () => {
    const schema = loadOntologySchema(kitRoot);
    assert.equal(schema.version, 1);
    assert.ok(schema.types.includes('Skill'));
    assert.ok(schema.types.includes('PhilosophySection'));
    assert.deepEqual(schema.memoryEntityTypes, [
      'GlossaryTerm',
      'Slo',
      'Preference',
      'ProjectFact'
    ]);
  });
});

describe('validateMemoryEntityWrites', () => {
  it('accepts allowlisted types', () => {
    const result = validateMemoryEntityWrites([
      { name: 'EDD', entityType: 'GlossaryTerm', observations: ['Eval-Driven Development'] }
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.rejected.length, 0);
  });

  it('rejects unknown types', () => {
    const result = validateMemoryEntityWrites([
      { name: 'x', entityType: 'AlienType', observations: ['nope'] }
    ]);
    assert.equal(result.ok, false);
    assert.equal(result.rejected[0]?.entityType, 'AlienType');
  });
});

describe('generateOntologyIndex', () => {
  it('indexes skills, sops, mcps, philosophy, and docs with path-ish ids', () => {
    const index = generateOntologyIndex(kitRoot);
    assert.ok(getEntity(index, 'skill:agent-tdd'));
    assert.ok(getEntity(index, 'sop:conventional-commits'));
    assert.ok(getEntity(index, 'mcp:kit-knowledge'));
    assert.ok(getEntity(index, 'philosophy:8'));
    const p8 = getEntity(index, 'philosophy:8');
    assert.equal(p8?.name, 'Interaction Mandate');
    assert.equal(p8?.attrs?.section, '8');
    assert.ok(getEntity(index, 'doc:edd'));
    assert.ok(getEntity(index, 'phase:tdd'));
  });

  it('emits depends-on and uses edges from skill frontmatter', () => {
    const index = generateOntologyIndex(kitRoot);
    const deps = getRelated(index, 'skill:agent-tdd', 'depends-on');
    assert.ok(deps.some((e) => e.to === 'skill:agent-spec'));
    const uses = getRelated(index, 'skill:agent-tdd', 'uses');
    assert.ok(uses.some((e) => e.to === 'mcp:context7'));
  });

  it('emits loads edges from skill SOP markdown links', () => {
    const index = generateOntologyIndex(kitRoot);
    const loads = getRelated(index, 'skill:agent-tdd', 'loads');
    assert.ok(loads.some((e) => e.to === 'sop:behavior-catalog-and-xfn'));
  });

  it('does not invent vendor-specific eval gates from suite filenames', () => {
    const index = generateOntologyIndex(kitRoot);
    const cf = getRelated(index, 'eval:cloudflare_ops', 'gates');
    assert.equal(cf.length, 0, 'cloudflare_ops must not hard-gate agent-cloudflare-ops by name');
    const arch = getRelated(index, 'eval:architecture_routing', 'gates');
    assert.equal(arch.length, 0, 'architecture_* must not hard-gate agent-arch-drift by name');
    const golden = getEntity(index, 'eval:goldens_architecture_routing');
    assert.ok(golden, 'goldens/*.yaml should be indexed');
    assert.equal(golden?.path, 'evals/edd/goldens/architecture_routing.yaml');
  });

  it('gates orchestrator specialist routing to the documented specialists', () => {
    const index = generateOntologyIndex(kitRoot);
    const gates = getRelated(index, 'eval:orchestrator_routing', 'gates');
    const targets = new Set(gates.map((e) => e.to));
    assert.ok(targets.has('skill:agent-orchestrator'));
    assert.ok(targets.has('skill:agent-review'));
    assert.ok(targets.has('skill:agent-debug'));
    assert.ok(targets.has('skill:agent-tdd'));
  });

  it('honors declarative ontology.gates in suite YAML', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ontology-gates-'));
    try {
      fs.mkdirSync(path.join(tmp, 'ontology'), { recursive: true });
      fs.copyFileSync(
        path.join(kitRoot, 'ontology', 'schema.yaml'),
        path.join(tmp, 'ontology', 'schema.yaml')
      );
      fs.writeFileSync(path.join(tmp, 'CODING_PHILOSOPHY.md'), '## 1. Hexagonal\n\nPorts.\n');
      fs.mkdirSync(path.join(tmp, 'mcps'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'mcps', 'catalog.json'),
        JSON.stringify({ servers: [{ id: 'memory', name: 'Memory' }] })
      );
      fs.mkdirSync(path.join(tmp, 'evals', 'edd'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'evals', 'edd', 'custom_suite.yaml'),
        `name: custom
dataset: x.jsonl
metrics:
  - type: tool_selection
ontology:
  gates:
    - mcp:memory
`
      );
      const index = generateOntologyIndex(tmp);
      const gates = getRelated(index, 'eval:custom_suite', 'gates');
      assert.ok(gates.some((e) => e.to === 'mcp:memory'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('checkOntology', () => {
  it('passes on a minimal consistent tree without a committed index', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ontology-'));
    try {
      fs.mkdirSync(path.join(tmp, 'ontology'), { recursive: true });
      fs.copyFileSync(
        path.join(kitRoot, 'ontology', 'schema.yaml'),
        path.join(tmp, 'ontology', 'schema.yaml')
      );
      fs.mkdirSync(path.join(tmp, 'SOPs'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'SOPs', 'demo.md'), '# demo\n\nSee §1.\n');
      fs.writeFileSync(
        path.join(tmp, 'CODING_PHILOSOPHY.md'),
        '## 1. Hexagonal\n\nPorts.\n\n## 2. DDD\n\nLanguage.\n'
      );
      fs.mkdirSync(path.join(tmp, 'mcps'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'mcps', 'catalog.json'),
        JSON.stringify({ servers: [{ id: 'memory', name: 'Memory' }] })
      );
      fs.mkdirSync(path.join(tmp, 'skills', 'agent-demo'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'skills', 'agent-demo', 'SKILL.md'),
        `---
name: agent-demo
description: demo
kind: role
phase: spec
triggers: [demo]
depends-on: []
mcp: [memory]
---
# Demo
See [SOP](../../SOPs/demo.md).
`
      );

      const result = checkOntology(tmp);
      assert.equal(result.ok, true);
      assert.equal(entityId('Skill', 'agent-demo'), 'skill:agent-demo');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
