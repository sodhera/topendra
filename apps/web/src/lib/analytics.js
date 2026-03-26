import posthog from 'posthog-js';
import { resolveAnalyticsConfig } from './runtimeConfig';

const ANALYTICS_STATIC_PROPS = {
  app_name: 'zazaspot',
  app_platform: 'web',
};

let analyticsBootstrapped = false;

function canUseBrowserAnalytics() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getAnalyticsConfig() {
  return resolveAnalyticsConfig();
}

export function isAnalyticsEnabled() {
  return Boolean(getAnalyticsConfig().posthogKey);
}

export function initializeAnalytics() {
  if (!canUseBrowserAnalytics() || analyticsBootstrapped || !isAnalyticsEnabled()) {
    return isAnalyticsEnabled() ? posthog : null;
  }

  const analyticsConfig = getAnalyticsConfig();

  posthog.init(analyticsConfig.posthogKey, {
    api_host: analyticsConfig.posthogHost,
    autocapture: true,
    capture_pageleave: true,
    capture_pageview: 'history_change',
    defaults: '2026-01-30',
    disable_session_recording: !analyticsConfig.posthogSessionReplayEnabled,
    mask_personal_data_properties: true,
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: true,
    },
    ui_host: analyticsConfig.posthogUIHost ?? undefined,
  });

  posthog.register({
    ...ANALYTICS_STATIC_PROPS,
    app_environment: import.meta.env.MODE,
  });

  analyticsBootstrapped = true;
  return posthog;
}

export function captureAnalyticsEvent(eventName, properties = {}) {
  const analyticsClient = initializeAnalytics();

  if (!analyticsClient) {
    return;
  }

  analyticsClient.capture(eventName, properties);
}

export function identifyAnalyticsUser({ distinctId, anonymousHandle, hasAnonymousHandle }) {
  const analyticsClient = initializeAnalytics();

  if (!analyticsClient || !distinctId) {
    return;
  }

  analyticsClient.identify(distinctId, {
    anonymous_handle: anonymousHandle || null,
    has_anonymous_handle: hasAnonymousHandle,
  });
}

export function resetAnalyticsUser() {
  if (!analyticsBootstrapped) {
    return;
  }

  posthog.reset();
}
