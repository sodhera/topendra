#!/usr/bin/env node

import { createRequire } from 'node:module';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { loadRootEnv } = require('./load-root-env.cjs');

loadRootEnv();

const MOBILE_AUTH_REDIRECT_URL = 'topey://auth/callback';
const DEFAULT_WEB_AUTH_REDIRECT_URLS = [
  'http://localhost:5173/**',
  'http://127.0.0.1:5173/**',
  'http://localhost:4173/**',
  'http://127.0.0.1:4173/**',
];

function getProjectRef() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is missing.');
  }

  return new URL(supabaseUrl).host.split('.')[0];
}

function parseConfiguredRedirectUrls(value) {
  return String(value ?? '')
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getSiteUrl() {
  return process.env.WEB_SITE_URL?.trim() || MOBILE_AUTH_REDIRECT_URL;
}

function getAllowedRedirectUrls() {
  const configuredRedirectUrls = parseConfiguredRedirectUrls(process.env.WEB_AUTH_REDIRECT_URLS);

  return Array.from(
    new Set([
      MOBILE_AUTH_REDIRECT_URL,
      ...DEFAULT_WEB_AUTH_REDIRECT_URLS,
      ...getLocalNetworkRedirectUrls(),
      ...configuredRedirectUrls,
    ])
  );
}

function getLocalNetworkRedirectUrls() {
  const interfaces = os.networkInterfaces();
  const urls = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (!entry || entry.internal || entry.family !== 'IPv4') {
        continue;
      }

      urls.push(`http://${entry.address}:5173/**`);
      urls.push(`http://${entry.address}:4173/**`);
    }
  }

  return urls;
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is missing.');
  }

  const projectRef = getProjectRef();
  const allowedRedirectUrls = getAllowedRedirectUrls();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: getSiteUrl(),
      uri_allow_list: allowedRedirectUrls.join(','),
      mailer_autoconfirm: true,
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
