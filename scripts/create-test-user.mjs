#!/usr/bin/env node

import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { loadRootEnv } = require('./load-root-env.cjs');

loadRootEnv();

const TEST_EMAIL = 'testuser@topey.app';
const TEST_PASSWORD = 'TopeyTest123!';

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase runtime environment variables are missing.');
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const signUpResult = await client.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      data: {
        full_name: 'Topey Test User',
      },
    },
  });

  if (signUpResult.error && !signUpResult.error.message.toLowerCase().includes('already registered')) {
    throw signUpResult.error;
  }

  const signInResult = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInResult.error) {
    throw signInResult.error;
  }

  console.log(
    JSON.stringify(
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        user_id: signInResult.data.user?.id ?? null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
