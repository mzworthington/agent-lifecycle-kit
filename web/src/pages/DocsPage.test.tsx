import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { DocsPage } from './DocsPage.tsx';

describe('DocsPage', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('renders the kit map authoring guide from ontology/README.md', () => {
    const { hook } = memoryLocation({ path: '/ontology' });
    render(
      <Router hook={hook}>
        <DocsPage />
      </Router>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Author the kit map' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /this is not a product architecture diagram/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Markdown source' }).getAttribute('href')).toBe(
      '/ontology/README.md'
    );
  });
});
