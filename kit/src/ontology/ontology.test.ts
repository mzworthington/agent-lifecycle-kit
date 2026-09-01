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
  regenerateOntologyIndex,
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
});

describe('checkOntology / regenerate', () => {
  it('detects drift then passes after regenerate in a temp copy of schema+minimal tree', () => {
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

      const before = checkOntology(tmp);
      assert.equal(before.drift, true);

      regenerateOntologyIndex(tmp);
      const after = checkOntology(tmp);
      assert.equal(after.drift, false);
      assert.equal(after.ok, true);
      assert.equal(entityId('Skill', 'agent-demo'), 'skill:agent-demo');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
