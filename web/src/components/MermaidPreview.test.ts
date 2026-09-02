import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import mermaid from 'mermaid';
import { splitFenceSegments } from '../docs/presentDocsMarkdown.ts';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function publishedMarkdownFiles(): string[] {
  const roots = [
    path.join(kitRoot, 'docs'),
    path.join(kitRoot, 'SOPs'),
    path.join(kitRoot, 'evals', 'edd'),
    path.join(kitRoot, 'mcps', 'README.md'),
    path.join(kitRoot, 'ontology', 'README.md')
  ];
  const files: string[] = [];
  for (const root of roots) {
    const stat = fs.statSync(root);
    if (stat.isFile()) {
      files.push(root);
      continue;
    }
    for (const entry of fs.readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (entry.endsWith('.md')) files.push(path.join(root, entry));
    }
  }
  return files;
}

describe('docs mermaid fences', () => {
  it('parses the feature-lifecycle diagram as a sequence diagram', async () => {
    const markdown = fs.readFileSync(path.join(kitRoot, 'docs/lifecycle.md'), 'utf8');
    const mermaidBlocks = splitFenceSegments(markdown).filter((segment) => segment.kind === 'mermaid');
    expect(mermaidBlocks).toHaveLength(1);
    const code = mermaidBlocks[0]!.code;
    expect(code).toMatch(/^sequenceDiagram/);
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    const parsed = await mermaid.parse(code);
    expect(parsed).toMatchObject({ diagramType: 'sequence' });
  });

  it('parses the ADR 0003 sequence with a quoted actor alias', async () => {
    const markdown = fs.readFileSync(
      path.join(kitRoot, 'docs/ADRs/0003-edd-default-for-agent-contracts.md'),
      'utf8'
    );
    const mermaidBlocks = splitFenceSegments(markdown).filter((segment) => segment.kind === 'mermaid');
    expect(mermaidBlocks).toHaveLength(1);
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    const parsed = await mermaid.parse(mermaidBlocks[0]!.code);
    expect(parsed).toMatchObject({ diagramType: 'sequence' });
  });

  it('parses every mermaid fence on published docs pages', async () => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    const failures: string[] = [];
    for (const file of publishedMarkdownFiles()) {
      const markdown = fs.readFileSync(file, 'utf8');
      const mermaidBlocks = splitFenceSegments(markdown).filter((segment) => segment.kind === 'mermaid');
      for (const [index, block] of mermaidBlocks.entries()) {
        try {
          await mermaid.parse(block.code);
        } catch (error) {
          const rel = path.relative(kitRoot, file);
          const detail = error instanceof Error ? error.message : String(error);
          failures.push(`${rel} fence ${index}: ${detail}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
