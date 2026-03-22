import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase environment variables are missing. Check your local .env file.');
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

export async function completeOAuthFlow(signInUrl, redirectUrl) {
  const result = await WebBrowser.openAuthSessionAsync(signInUrl, redirectUrl);

  if (result.type !== 'success' || !result.url) {
    return null;
  }

  const normalizedUrl = result.url.replace('#', '?');
  const { queryParams } = Linking.parse(normalizedUrl);

  if (queryParams?.code) {
    return {
      code: String(queryParams.code),
    };
  }

  if (queryParams?.access_token && queryParams?.refresh_token) {
    return {
      access_token: String(queryParams.access_token),
      refresh_token: String(queryParams.refresh_token),
    };
  }

  throw new Error('The OAuth provider returned without a usable Supabase session.');
}
