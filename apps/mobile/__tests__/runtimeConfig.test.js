jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: null,
    expoGoConfig: null,
    manifest2: null,
    manifest: null,
  },
}));

import { resolveSupabaseConfig } from '../src/lib/runtimeConfig';

describe('resolveSupabaseConfig', () => {
  test('prefers process env values when they are available', () => {
    const config = resolveSupabaseConfig({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: 'https://env.example.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'env-key',
      },
      extra: {
        supabaseUrl: 'https://extra.example.supabase.co',
        supabasePublishableKey: 'extra-key',
      },
    });

    expect(config).toEqual({
      supabaseUrl: 'https://env.example.supabase.co',
      supabasePublishableKey: 'env-key',
    });
  });

  test('falls back to expo extra values when process env is empty', () => {
    const config = resolveSupabaseConfig({
      env: {},
      extra: {
        supabaseUrl: 'https://extra.example.supabase.co',
        supabasePublishableKey: 'extra-key',
      },
    });

    expect(config).toEqual({
      supabaseUrl: 'https://extra.example.supabase.co',
      supabasePublishableKey: 'extra-key',
    });
  });

  test('returns null values when no runtime config is available', () => {
    const config = resolveSupabaseConfig({
      env: {},
      extra: {},
    });

    expect(config).toEqual({
      supabaseUrl: null,
      supabasePublishableKey: null,
    });
  });
});
