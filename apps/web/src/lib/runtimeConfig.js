function getFirstDefinedString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0) ?? null;
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
