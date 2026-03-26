import { createAnalyticsEvent } from './backend';
import { hasSupabaseConfig } from './supabase';

const analyticsContext = {
  pagePath: '/',
  screenName: 'unknown',
  userId: null,
  viewerSessionId: '',
};

let analyticsInitialized = false;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

export function initializeAnalytics() {
  analyticsInitialized = true;
}

export function setAnalyticsContext(nextContext = {}) {
  if (typeof nextContext.pagePath === 'string') {
    analyticsContext.pagePath = normalizeText(nextContext.pagePath) || '/';
  }

  if (typeof nextContext.screenName === 'string') {
    analyticsContext.screenName = normalizeText(nextContext.screenName) || 'unknown';
  }

  if (typeof nextContext.viewerSessionId === 'string') {
    analyticsContext.viewerSessionId = normalizeText(nextContext.viewerSessionId);
  }
}

export function identifyAnalyticsUser({ distinctId }) {
  analyticsContext.userId = normalizeText(distinctId) || null;
}

export function resetAnalyticsUser() {
  analyticsContext.userId = null;
}

export function captureAnalyticsEvent(eventName, properties = {}) {
  if (!analyticsInitialized || !hasSupabaseConfig || !analyticsContext.viewerSessionId) {
    return;
  }

  const normalizedProperties = normalizeProperties(properties);
  const sourceScreen = normalizeText(normalizedProperties.source_screen) || analyticsContext.screenName;
  const placeId = normalizeText(normalizedProperties.place_id) || null;

  delete normalizedProperties.source_screen;
  delete normalizedProperties.place_id;

  createAnalyticsEvent({
    eventName,
    pagePath: analyticsContext.pagePath,
    placeId,
    properties: normalizedProperties,
    sourceScreen,
    userId: analyticsContext.userId,
    viewerSessionId: analyticsContext.viewerSessionId,
  }).catch(() => undefined);
}
