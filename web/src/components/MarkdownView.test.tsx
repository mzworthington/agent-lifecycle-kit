import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './MarkdownView.tsx';

describe('MarkdownView', () => {
  it('puts fenced commands in a code figure and tables in a scroll wrapper', () => {
    render(
      <MarkdownView
        fromDir="docs"
        markdown={`# Kit

\`\`\`bash
kit check
\`\`\`

| Command | Role |
|---------|------|
| \`kit check\` | gate |
`}
      />
    );

    const figure = document.querySelector('figure.docs-code');
    expect(figure).toBeTruthy();
    expect(figure?.querySelector('pre')?.textContent).toContain('kit check');
    expect(document.querySelector('.table-wrapper table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Command' })).toBeTruthy();
  });
});
