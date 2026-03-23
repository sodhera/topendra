# Monorepo Guide

## Layout

```text
apps/
  mobile/   Expo app for iOS and Android
  web/      Browser app built with Vite + React
packages/
  shared/   Shared data, theme, auth helpers, and geo utilities
```

## Workspace Responsibilities

### `apps/mobile`

Owns:

- live mobile navigation
- Supabase session restore
- add place, vote, and comment flows
- location permission handling
- custom mobile map markers, including the rainbow current-location marker
- mobile-specific UI and Expo config

### `apps/web`

Owns:

- browser entrypoint
- browser layout and styling
- web-specific tile map integration and interaction
- HTML-backed Leaflet marker rendering with enlarged hit targets for browser click reliability
- browser-side Supabase session and data wiring
- desktop camera controls and browser-only regression tests

Current product scope:

- render the same map-first Topey shell as the app
- browse and inspect Kathmandu place drops
- sign in, vote, comment, and add places when browser Supabase config is present
- open locations externally
- fall back to shared demo data when Supabase is unavailable

### `packages/shared`

Owns cross-platform source-of-truth modules:

- `data/demoCatalog.js`
- `data/seed.js`
- `lib/auth.js`
- `lib/constants.js`
- `lib/geo.js`
- `lib/theme.js`

Rule:

- if both mobile and web need it, prefer moving it here instead of duplicating logic

## Commands

Install everything:

```bash
./scripts/with-local-node.sh npm install
```

Run mobile:

```bash
./scripts/with-local-node.sh npm run mobile:start
./scripts/with-local-node.sh npm run mobile:ios
./scripts/with-local-node.sh npm run mobile:android
```

Important:

- root mobile scripts use `npm --prefix apps/mobile ...` so Expo runs with `apps/mobile` as the project root
- the monorepo root also keeps a tiny `App.js` fallback that re-exports `apps/mobile/App.js` in case Expo resolves the default entry from the repo root
- the mobile app and repo scripts load environment values from the repo-root `.env`, not a duplicate `apps/mobile/.env`

Run web:

```bash
./scripts/with-local-node.sh npm run web:dev
./scripts/with-local-node.sh npm run web:build
./scripts/with-local-node.sh npm run web:test
```

Verify:

```bash
./scripts/with-local-node.sh npm run mobile:test
./scripts/with-local-node.sh npm run mobile:doctor
./scripts/with-local-node.sh npm run web:build
./scripts/with-local-node.sh npm run web:test
```

## Dependency Rules

- keep app-specific dependencies inside the owning workspace
- keep shared package dependencies minimal
- avoid making `packages/shared` depend on Expo or DOM-only libraries

## Editing Rules

- mobile-specific code stays under `apps/mobile`
- browser-specific code stays under `apps/web`
- shared logic belongs in `packages/shared`
- if a file move changes public paths, update the docs in the same change
