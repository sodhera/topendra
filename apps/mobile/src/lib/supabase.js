import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './runtimeConfig';

const { supabaseUrl, supabasePublishableKey } = resolveSupabaseConfig();

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase environment variables are missing. Check the repo-root .env file.');
}

const supabaseProjectRef = new URL(supabaseUrl).host.split('.')[0];
const authStorageKey = `sb-${supabaseProjectRef}-auth-token`;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: authStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function getAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: 'zazaspot',
    path: 'auth/callback',
  });
}

function parseAuthCallbackQuery(url) {
  const normalizedUrl = url.replace('#', '?');
  const { queryParams } = Linking.parse(normalizedUrl);
  return queryParams ?? {};
}

function isInvalidRefreshTokenError(error) {
  return /invalid refresh token|refresh token not found/i.test(String(error?.message ?? error ?? ''));
}

async function clearPersistedAuthState() {
  await AsyncStorage.multiRemove([
    authStorageKey,
    `${authStorageKey}-code-verifier`,
    `${authStorageKey}-user`,
  ]);
}

export async function getSafeSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error && isInvalidRefreshTokenError(error)) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      await clearPersistedAuthState();
    }

    await clearPersistedAuthState();

    return {
      session: null,
      recoveredFromInvalidToken: true,
    };
  }

  if (error) {
    throw error;
  }

  return {
    session: data.session ?? null,
    recoveredFromInvalidToken: false,
  };
}

export async function restoreSessionFromUrl(url) {
  if (!url) {
    return null;
  }

  const queryParams = parseAuthCallbackQuery(url);

  if (queryParams.error_description || queryParams.error) {
    throw new Error(String(queryParams.error_description ?? queryParams.error));
  }

  if (queryParams.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(queryParams.code));

    if (error) {
      throw error;
    }

    return data.session ?? null;
  }

  if (queryParams.access_token && queryParams.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: String(queryParams.access_token),
      refresh_token: String(queryParams.refresh_token),
    });

    if (error) {
      throw error;
    }

    return data.session ?? null;
  }

  if (queryParams.token_hash && queryParams.type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: String(queryParams.token_hash),
      type: String(queryParams.type),
    });

    if (error) {
      throw error;
    }

    return data.session ?? null;
  }

  return null;
}
