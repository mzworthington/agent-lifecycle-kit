import posthog from 'posthog-js';
import { POSTHOG_SDK_DEFAULTS, resolvePostHogConfig, type PostHogEnv } from './posthogConfig';

export type PostHogInitClient = {
  init: (
    apiKey: string,
    options: {
      api_host: string;
      ui_host: string;
      defaults: typeof POSTHOG_SDK_DEFAULTS;
      capture_pageview: 'history_change';
      cookieless_mode: 'always';
      person_profiles: 'never';
      disable_session_recording: true;
    }
  ) => unknown;
};

const defaultPostHogClient: PostHogInitClient = {
  init: (apiKey, options) => posthog.init(apiKey, options)
};

export function bootBrowserPostHog(
  env: PostHogEnv,
  client: PostHogInitClient = defaultPostHogClient,
  options?: { onMissingInDev?: (message: string) => void }
): boolean {
  const config = resolvePostHogConfig(env, options);
  if (!config.enabled) {
    return false;
  }
  client.init(config.apiKey, {
    api_host: config.apiHost,
    ui_host: 'https://eu.posthog.com',
    defaults: POSTHOG_SDK_DEFAULTS,
    capture_pageview: 'history_change',
    cookieless_mode: 'always',
    person_profiles: 'never',
    disable_session_recording: true
  });
  return true;
}
