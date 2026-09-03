import { describe, expect, it } from 'vitest';
import { SITE_FOOTER_NAV } from './footerNav';

describe('SITE_FOOTER_NAV', () => {
  it('links the privacy notice from the site footer', () => {
    expect(SITE_FOOTER_NAV.map((item) => item.href)).toContain('/privacy');
  });
});
