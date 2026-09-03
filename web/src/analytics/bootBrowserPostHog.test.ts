import { describe, expect, it, vi } from 'vitest';
import { bootBrowserPostHog } from './bootBrowserPostHog';
import { POSTHOG_SDK_DEFAULTS } from './posthogConfig';

describe('bootBrowserPostHog', () => {
  it('does not init without a token', () => {
    const init = vi.fn();
    expect(bootBrowserPostHog({}, { init })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('inits cookieless pageviews without session replay', () => {
    const init = vi.fn();
    expect(bootBrowserPostHog({ POSTHOG_TOKEN: 'phc_test' }, { init })).toBe(true);
    expect(init).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://a.mzworthington.co.uk',
      ui_host: 'https://eu.posthog.com',
      defaults: POSTHOG_SDK_DEFAULTS,
      capture_pageview: 'history_change',
      cookieless_mode: 'always',
      person_profiles: 'never',
      disable_session_recording: true
    });
  });
});
