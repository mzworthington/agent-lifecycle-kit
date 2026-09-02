import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage.tsx';

describe('HomePage', () => {
  it('uses the brand-first hero, job picker, proof, and demo', () => {
    render(<HomePage />);
    expect(screen.getByText('Eval-Driven Development')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Agent Lifecycle Kit' })).toBeTruthy();
    expect(screen.getByText('Test the tools your agents call')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'CI passing' })).toBeTruthy();
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
