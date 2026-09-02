import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TodayJobs } from './TodayJobs.tsx';

afterEach(() => {
  cleanup();
});

describe('TodayJobs', () => {
  it('shows steps under the selected job and names the action on each card', () => {
    render(<TodayJobs showHeading />);

    const first = screen.getByRole('button', { pressed: true });
    expect(first.textContent).toMatch(/showing steps/i);
    expect(first.textContent).toMatch(/never installed waykit/i);

    const panel = screen.getByRole('region', { name: /i have never installed waykit/i });
    expect(within(panel).getByText('Start here:')).toBeTruthy();
    expect(first.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /starting a product feature/i }));

    const feature = screen.getByRole('button', { pressed: true });
    expect(feature.textContent).toMatch(/starting a product feature/i);
    expect(feature.textContent).toMatch(/showing steps/i);
    expect(first.getAttribute('aria-pressed')).toBe('false');
    expect(first.textContent).toMatch(/show steps/i);

    const featurePanel = screen.getByRole('region', { name: /starting a product feature/i });
    expect(within(featurePanel).getByText(/open the orchestrator skill/i)).toBeTruthy();
    expect(feature.compareDocumentPosition(featurePanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
