import { describe, expect, it } from 'vitest';
import { HOME_BRAND, HOME_EYEBROW, HOME_HEADLINE, HOME_NEXT } from './copy.ts';

describe('homepage copy', () => {
  it('puts the kit name first, then the job line', () => {
    expect(HOME_EYEBROW).toBe('Eval-Driven Development');
    expect(HOME_BRAND).toBe('Agent Lifecycle Kit');
    expect(HOME_HEADLINE).toMatch(/tools your agents call/i);
    expect(HOME_NEXT).toHaveLength(4);
  });
});
