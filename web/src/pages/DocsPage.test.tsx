import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { DocsPage } from './DocsPage.tsx';

describe('DocsPage', () => {
  it('renders breadcrumbs and markdown for a published guide', () => {
    const { hook } = memoryLocation({ path: '/docs/start' });
    render(
      <Router hook={hook}>
        <DocsPage />
      </Router>
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /getting started/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Markdown source' }).getAttribute('href')).toBe('/docs/start.md');
  });
});
