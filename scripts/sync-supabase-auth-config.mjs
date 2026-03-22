#!/usr/bin/env node

function getProjectRef() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is missing.');
  }

  return new URL(supabaseUrl).host.split('.')[0];
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is missing.');
  }

  const projectRef = getProjectRef();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: 'topey://auth/callback',
      uri_allow_list: 'topey://auth/callback',
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase auth config update failed (${response.status}): ${body}`);
  }

  console.log(body || 'Supabase auth config updated.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
