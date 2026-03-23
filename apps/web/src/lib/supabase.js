import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './runtimeConfig';

const { supabaseUrl, supabasePublishableKey } = resolveSupabaseConfig();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

export async function getSafeSession() {
  if (!supabase) {
    return {
      session: null,
      recoveredFromInvalidToken: false,
    };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return {
    session: data.session ?? null,
    recoveredFromInvalidToken: false,
  };
}
