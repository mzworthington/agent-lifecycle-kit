import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_POSTHOG_HOST,
  MISSING_POSTHOG_KEY_MESSAGE,
  resolvePostHogConfig
} from './posthogConfig';

describe('resolvePostHogConfig', () => {
  it('skips init when the token is missing', () => {
    const onMissingInDev = vi.fn();
    expect(resolvePostHogConfig({}, { onMissingInDev })).toEqual({ enabled: false });
    expect(onMissingInDev).not.toHaveBeenCalled();
  });

  it('warns in local development when the token is missing', () => {
    const onMissingInDev = vi.fn();
    expect(
      resolvePostHogConfig({ DEV: true, MODE: 'development' }, { onMissingInDev })
    ).toEqual({ enabled: false });
    expect(onMissingInDev).toHaveBeenCalledWith(MISSING_POSTHOG_KEY_MESSAGE);
  });

  it('uses the reverse-proxy host by default', () => {
    expect(resolvePostHogConfig({ POSTHOG_TOKEN: ' phc_test ' })).toEqual({
      enabled: true,
      apiKey: 'phc_test',
      apiHost: DEFAULT_POSTHOG_HOST
    });
    expect(DEFAULT_POSTHOG_HOST).toBe('https://a.mzworthington.co.uk');
  });

  it('honours POSTHOG_HOST when set', () => {
    expect(
      resolvePostHogConfig({
        POSTHOG_TOKEN: 'phc_test',
        POSTHOG_HOST: ' https://eu.i.posthog.com '
      })
    ).toEqual({
      enabled: true,
      apiKey: 'phc_test',
      apiHost: 'https://eu.i.posthog.com'
    });
  });
});
