import { describe, expect, it } from 'vitest';
import { parseDemoMarkdown } from './EvalDemo';

describe('parseDemoMarkdown', () => {
  it('splits titled steps and fenced code', () => {
    const md = `# Demo\n\nLead line.\n\n## 1. Case\n\nIntro\n\n\`\`\`json\n{"id":"x"}\n\`\`\`\n\n## 2. Red\n\nFailed.\n\n\`\`\`\nFAIL\n\`\`\`\n`;
    const { lead, steps } = parseDemoMarkdown(md);
    expect(lead).toContain('Lead line');
    expect(steps).toHaveLength(2);
    expect(steps[0]?.title).toBe('1. Case');
    expect(steps[0]?.code).toContain('"id"');
    expect(steps[1]?.title).toBe('2. Red');
  });
});
