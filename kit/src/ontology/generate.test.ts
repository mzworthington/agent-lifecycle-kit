import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  generateOntologyIndex,
  getEntity,
  getRelated,
  isGitIgnored,
  serializeOntologyIndex,
  writeSiteOntologyIndex
} from './generate.js';
import type { OntologyIndex } from './types.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function seedKit(root: string): void {
  fs.mkdirSync(path.join(root, 'ontology'), { recursive: true });
  fs.copyFileSync(path.join(kitRoot, 'ontology', 'schema.yaml'), path.join(root, 'ontology', 'schema.yaml'));
  fs.writeFileSync(
    path.join(root, 'CODING_PHILOSOPHY.md'),
    '## 1. Hexagonal Architecture\n\nPorts.\n\n## 8. Interaction Mandate\n\nMermaid.\n'
  );
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'edd.md'), '# EDD\n');
  fs.writeFileSync(path.join(root, 'docs', 'subagents.md'), '# Subagents\n');
  fs.mkdirSync(path.join(root, 'SOPs'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'SOPs', 'eval-driven-development.md'),
    'See [EDD](../docs/edd.md) and §8.\n'
  );
  fs.mkdirSync(path.join(root, 'mcps'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'mcps', 'catalog.json'),
    JSON.stringify({ servers: [{ id: 'memory', name: 'Memory' }] })
  );
  fs.mkdirSync(path.join(root, 'skills', 'agent-demo'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'skills', 'agent-demo', 'SKILL.md'),
    `---
name: agent-demo
kind: role
phase: spec
depends-on: [agent-missing]
mcp: [memory]
---
# Demo
Load [SOP](../../SOPs/eval-driven-development.md).
`
  );
  fs.mkdirSync(path.join(root, 'skills', 'agent-demo', 'evals'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'agent-demo', 'evals', 'eval.json'), '{}\n');
  fs.mkdirSync(path.join(root, 'evals', 'edd'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'evals', 'edd', 'custom.yaml'),
    `name: custom
ontology:
  gates:
    - mcp:memory
    - not-an-id
`
  );
  fs.mkdirSync(path.join(root, 'handover', 'archlens'), { recursive: true });
  fs.writeFileSync(path.join(root, 'handover', 'archlens', 'handover_tdd.md'), '# tdd\n');
  fs.writeFileSync(path.join(root, 'handover', 'archlens', 'README.md'), 'not a handover\n');
  fs.mkdirSync(path.join(root, 'agents'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'agents', 'agent-demo.md'),
    `---
name: agent-demo
description: "Demo specialist"
model: inherit
readonly: true
---

Load the playbook. See [subagents](../docs/subagents.md).
`
  );
  fs.writeFileSync(path.join(root, 'agents', 'README.md'), '# agents\n');
}

function withKit(run: (root: string, index: OntologyIndex) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-generate-'));
  try {
    seedKit(root);
    run(root, generateOntologyIndex(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('generateOntologyIndex', () => {
  it('names philosophy sections from headings and keeps numeric ids', () => {
    withKit((_root, index) => {
      const p8 = getEntity(index, 'philosophy:8');
      assert.equal(p8?.name, 'Interaction Mandate');
      assert.equal(p8?.attrs?.section, '8');
      assert.equal(p8?.path, 'CODING_PHILOSOPHY.md');
      assert.ok(getEntity(index, 'philosophy:1'));
    });
  });

  it('chains phases with orders edges from schema.phaseOrder', () => {
    withKit((_root, index) => {
      assert.ok(getEntity(index, 'phase:tdd'));
      const orders = index.edges.filter((e) => e.relation === 'orders');
      assert.ok(orders.some((e) => e.from === 'phase:spec' && e.to === 'phase:tdd'));
    });
  });

  it('wires skill uses/loads and drops depends-on when the target skill is missing', () => {
    withKit((_root, index) => {
      assert.ok(getRelated(index, 'skill:agent-demo', 'uses').some((e) => e.to === 'mcp:memory'));
      assert.ok(
        getRelated(index, 'skill:agent-demo', 'loads').some((e) => e.to === 'sop:eval-driven-development')
      );
      assert.equal(getRelated(index, 'skill:agent-demo', 'depends-on').length, 0);
      assert.deepEqual(getEntity(index, 'skill:agent-demo')?.attrs?.dependsOn, ['agent-missing']);
    });
  });

  it('links SOPs to docs they reference and philosophy sections they cite', () => {
    withKit((_root, index) => {
      assert.ok(getRelated(index, 'sop:eval-driven-development', 'references').some((e) => e.to === 'doc:edd'));
      assert.ok(
        getRelated(index, 'sop:eval-driven-development', 'implements').some((e) => e.to === 'philosophy:8')
      );
    });
  });

  it('indexes eval suites only from explicit gates and skill-local eval.json', () => {
    withKit((_root, index) => {
      assert.ok(getRelated(index, 'eval:custom', 'gates').some((e) => e.to === 'mcp:memory'));
      assert.equal(
        getRelated(index, 'eval:custom', 'gates').some((e) => e.to === 'not-an-id'),
        false
      );
      assert.ok(getEntity(index, 'eval:skill-agent-demo'));
      assert.ok(getRelated(index, 'eval:skill-agent-demo', 'gates').some((e) => e.to === 'skill:agent-demo'));
    });
  });

  it('indexes local handover_*.md against phases and ignores other files in that folder', () => {
    withKit((_root, index) => {
      const ho = getEntity(index, 'handover:archlens/tdd');
      assert.ok(ho);
      assert.equal(ho?.attrs?.project, 'archlens');
      assert.ok(getRelated(index, 'handover:archlens/tdd', 'for').some((e) => e.to === 'phase:tdd'));
      assert.equal(
        index.entities.some((e) => e.path?.endsWith('README.md')),
        false
      );
    });
  });

  it('indexes host subagent stubs as adapters over skills and skips agents/README.md', () => {
    withKit((_root, index) => {
      const stub = getEntity(index, 'subagent:agent-demo');
      assert.ok(stub);
      assert.equal(stub?.attrs?.readonly, true);
      assert.equal(stub?.path, 'agents/agent-demo.md');
      assert.ok(getRelated(index, 'subagent:agent-demo', 'adapts').some((e) => e.to === 'skill:agent-demo'));
      assert.ok(getRelated(index, 'subagent:agent-demo', 'references').some((e) => e.to === 'doc:subagents'));
      assert.equal(getEntity(index, 'subagent:README'), null);
    });
  });

  it('skips directories that are not skills (no SKILL.md)', () => {
    withKit((root) => {
      fs.mkdirSync(path.join(root, 'skills', 'README.md'), { recursive: true });
      const index = generateOntologyIndex(root);
      assert.equal(getEntity(index, 'skill:README.md'), null);
    });
  });

  it('ignores a malformed MCP catalog instead of throwing', () => {
    withKit((root) => {
      fs.writeFileSync(path.join(root, 'mcps', 'catalog.json'), '{not json');
      const index = generateOntologyIndex(root);
      assert.equal(getEntity(index, 'mcp:memory'), null);
      assert.ok(getEntity(index, 'skill:agent-demo'));
    });
  });
});

describe('writeSiteOntologyIndex', () => {
  it('writes a live cache that keeps handovers and a homepage copy that strips them', () => {
    withKit((root, live) => {
      assert.ok(getEntity(live, 'handover:archlens/tdd'));
      const { cachePath, sitePath } = writeSiteOntologyIndex(root, live);
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as OntologyIndex;
      const site = JSON.parse(fs.readFileSync(sitePath, 'utf8')) as OntologyIndex;
      assert.ok(getEntity(cache, 'handover:archlens/tdd'));
      assert.equal(getEntity(site, 'handover:archlens/tdd'), null);
      assert.equal(
        site.edges.some((e) => e.from.startsWith('handover:') || e.to.startsWith('handover:')),
        false
      );
      assert.ok(getEntity(site, 'skill:agent-demo'));
      assert.match(sitePath, /web\/public\/assets\/ontology-index\.json$/);
      assert.match(serializeOntologyIndex(site), /\n$/);
    });
  });
});

describe('isGitIgnored', () => {
  it('treats kit handover project files as ignored and schema as tracked', () => {
    assert.equal(isGitIgnored(kitRoot, 'ontology/schema.yaml'), false);
    assert.equal(isGitIgnored(kitRoot, 'handover/archlens/handover_tdd.md'), true);
  });
});

describe('generateOntologyIndex committedOnly', () => {
  it('omits gitignored handover files in this kit checkout', () => {
    const live = generateOntologyIndex(kitRoot);
    const committed = generateOntologyIndex(kitRoot, { committedOnly: true });
    const liveHo = live.entities.filter((e) => e.type === 'Handover').length;
    const committedHo = committed.entities.filter((e) => e.type === 'Handover').length;
    assert.ok(committedHo <= liveHo);
    assert.equal(committedHo, 0);
    assert.ok(getEntity(committed, 'skill:agent-tdd'));
  });
});
