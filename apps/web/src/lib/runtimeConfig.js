function getFirstDefinedString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0) ?? null;
}

function getFirstDefinedBoolean(...values) {
  const resolvedValue = values.find(
    (value) => typeof value === 'boolean' || typeof value === 'string'
  );

  if (typeof resolvedValue === 'boolean') {
    return resolvedValue;
  }

  if (typeof resolvedValue === 'string') {
    const normalizedValue = resolvedValue.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
      return false;
    }
  }

  return null;
}

export function resolveSupabaseConfig({
  env = typeof import.meta !== 'undefined' ? import.meta.env : {},
  processEnv = typeof process !== 'undefined' ? process.env : {},
} = {}) {
  return {
    supabaseUrl: getFirstDefinedString(
      env.EXPO_PUBLIC_SUPABASE_URL,
      env.VITE_SUPABASE_URL,
      processEnv.EXPO_PUBLIC_SUPABASE_URL,
      processEnv.VITE_SUPABASE_URL
    ),
    supabasePublishableKey: getFirstDefinedString(
      env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
      processEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      processEnv.VITE_SUPABASE_PUBLISHABLE_KEY
    ),
  };
}

export function resolveAnalyticsConfig({
  env = typeof import.meta !== 'undefined' ? import.meta.env : {},
  processEnv = typeof process !== 'undefined' ? process.env : {},
} = {}) {
  return {
    posthogKey: getFirstDefinedString(
      env.VITE_POSTHOG_KEY,
      processEnv.VITE_POSTHOG_KEY
    ),
    posthogHost:
      getFirstDefinedString(env.VITE_POSTHOG_HOST, processEnv.VITE_POSTHOG_HOST) ??
      'https://us.i.posthog.com',
    posthogUIHost: getFirstDefinedString(
      env.VITE_POSTHOG_UI_HOST,
      processEnv.VITE_POSTHOG_UI_HOST
    ),
    posthogSessionReplayEnabled:
      getFirstDefinedBoolean(
        env.VITE_POSTHOG_ENABLE_SESSION_REPLAY,
        processEnv.VITE_POSTHOG_ENABLE_SESSION_REPLAY
      ) ?? true,
  };
}
