# Monorepo Guide

## Layout

```text
apps/
  mobile/   Expo app for iOS and Android
  web/      Browser app built with Vite + React
packages/
  shared/   Shared auth helpers, geo helpers, theme tokens, constants, and fixtures
```

## Workspace Responsibilities

### `apps/mobile`

Owns:

- native navigation
- mobile auth/session restore
- native map presentation
- add place, place vote, comment, reply, and comment-vote flows
- mobile-specific UI

### `apps/web`

Owns:

- browser entrypoint
- browser styling and routed `/places/:id` pages
- Leaflet integration
- browser auth/session restore
- web optimistic place-vote UX
- browser-specific tests

### `packages/shared`

Owns:

- `lib/auth.js`
- `lib/constants.js`
- `lib/geo.js`
- `lib/theme.js`
- deterministic fixtures under `data/`

Rule:

- if both clients need it, prefer putting it here

## Current Product Rules

- runtime data is live Supabase data
- shared demo fixtures are for tests and reference, not runtime fallback
- visible place dots are no longer zoom-thinned
- anonymous public identity is derived from a unique claimed handle

## Commands

Install:

```bash
./scripts/with-local-node.sh npm install
```

Run mobile:

```bash
./scripts/with-local-node.sh npm run mobile:start
./scripts/with-local-node.sh npm run mobile:ios
./scripts/with-local-node.sh npm run mobile:android
```

Run web:

```bash
./scripts/with-local-node.sh npm run web:dev
./scripts/with-local-node.sh npm run web:build
./scripts/with-local-node.sh npm run web:test
```

Verify:

```bash
./scripts/with-local-node.sh npm run mobile:test
./scripts/with-local-node.sh npm run web:test
./scripts/with-local-node.sh npm run web:build
```

## Editing Rules

- mobile-only code stays under `apps/mobile`
- browser-only code stays under `apps/web`
- shared behavior belongs in `packages/shared`
- if you change shipped behavior, update the relevant docs in the same change
