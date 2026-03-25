#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { stat, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { loadRootEnv } = require('./load-root-env.cjs');

loadRootEnv();

function getProjectRef() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is missing.');
  }

  return new URL(supabaseUrl).host.split('.')[0];
}

async function main() {
  const sqlPath = process.argv[2];

  if (!sqlPath) {
    throw new Error('Usage: node scripts/apply-supabase-sql.mjs <sql-file-or-directory>');
  }

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is missing.');
  }

  const pathStats = await stat(sqlPath);
  const sqlFiles = pathStats.isDirectory()
    ? (await readdir(sqlPath))
        .filter((entry) => entry.endsWith('.sql'))
        .sort()
        .map((entry) => path.join(sqlPath, entry))
    : [sqlPath];
  const projectRef = getProjectRef();

  for (const sqlFile of sqlFiles) {
    const query = await readFile(sqlFile, 'utf8');
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Supabase query failed (${response.status}) for ${sqlFile}: ${body}`);
    }

    console.log(body || `Applied ${sqlFile}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
