import Constants from 'expo-constants';

function getExpoExtra() {
  return (
    Constants.expoConfig?.extra ??
    Constants.expoGoConfig?.extra ??
    Constants.manifest2?.extra ??
    Constants.manifest?.extra ??
    {}
  );
}

function getFirstDefinedString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0) ?? null;
}

export function resolveSupabaseConfig({ env = process.env, extra = getExpoExtra() } = {}) {
  return {
    supabaseUrl: getFirstDefinedString(
      env.EXPO_PUBLIC_SUPABASE_URL,
      extra.supabaseUrl,
      extra.EXPO_PUBLIC_SUPABASE_URL
    ),
    supabasePublishableKey: getFirstDefinedString(
      env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      extra.supabasePublishableKey,
      extra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
  };
}
