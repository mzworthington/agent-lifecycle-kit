import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeLanding } from './HomeLanding.tsx';

describe('HomeLanding', () => {
  it('uses the brand-first hero, job picker, proof, and demo', () => {
    render(<HomeLanding />);
    expect(screen.getByText('Eval-Driven Development')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Agent Lifecycle Kit' })).toBeTruthy();
    expect(screen.getByText('Test the tools your agents call')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'CI passing' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'EDD harness' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Docs at eval-driven.dev' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Unlicense' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Latest GitHub release' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Latest GitHub release' }).getAttribute('href')).toMatch(
      /github\.com\/mzworthington\/agent-lifecycle-kit\/releases$/
    );
    expect(screen.getByRole('heading', { name: /what do i use this for today/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Job list' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Before: eyeball the chat' })).toBeTruthy();
    expect(screen.getByText('Typically payment systems use PostgreSQL…', { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Walk the interactive demo' }).getAttribute('href')).toBe(
      '#demo'
    );
    expect(screen.getByRole('heading', { name: /demo: a miss becomes a failing eval/i })).toBeTruthy();
  });
});
