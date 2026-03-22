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

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function getAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: 'topey',
    path: 'auth/callback',
  });
}

function parseAuthCallbackQuery(url) {
  const normalizedUrl = url.replace('#', '?');
  const { queryParams } = Linking.parse(normalizedUrl);
  return queryParams ?? {};
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
