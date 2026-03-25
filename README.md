# Topey

Topey is a map-first monorepo with:

- `apps/mobile`: the Expo app for iOS and Android
- `apps/web`: the Vite browser app
- `packages/shared`: shared auth helpers, map utilities, theme tokens, and deterministic test fixtures

The live product is backed by Supabase for:

- places
- place votes
- comment threads and replies
- comment votes
- anonymous handle claims
- session persistence
- email-link auth
- place-open tracking

## Repo

GitHub: [SurazKhati/topey](https://github.com/SurazKhati/topey)

```bash
git clone https://github.com/SurazKhati/topey.git
cd topey
```

## Current Product Shape

- Both apps are live-data clients. Demo fixtures remain in `packages/shared/data` for tests, not for runtime fallback.
- The mobile and web maps now keep every visible place dot; wide zoom levels do not thin or drop markers anymore.
- The web app routes place details to `/places/:id`.
- The mobile app still opens place details inside native modal surfaces.
- Place discussions support:
  - top-level comments
  - replies through `parent_comment_id`
  - one vote row per user per place
  - one vote row per user per comment
- Browser place votes are optimistic in the UI.
- Account setup is anonymous-by-default:
  - users enter email for auth
  - users claim a unique anonymous handle for public activity
  - public UI never falls back to real-world identity fields
- Placeholder `Topey demo` / `Topey team` place rows are now removed by the seed cleanup path instead of being recreated.

## Workspace Layout

```text
apps/
  mobile/   Expo app for iOS and Android
  web/      Vite browser app
packages/
  shared/   Shared auth helpers, theme, geo helpers, and test fixtures
```

## Environment Setup

1. Install dependencies

```bash
npm install
```

If this shell does not already have `node` and `npm` on the path:

```bash
./scripts/with-local-node.sh npm install
```

2. Create local env values

```bash
cp .env.example .env
```

Required variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

Optional variables:

- `WEB_AUTH_REDIRECT_URLS`
- `WEB_SITE_URL`

3. Sync the Supabase project

```bash
npm run supabase:auth
npm run supabase:migrate
npm run supabase:seed
```

What these do:

- `supabase:auth`: syncs mobile deep-link and local web redirect allow-lists
- `supabase:migrate`: applies every SQL migration in `supabase/migrations`
- `supabase:seed`: clears placeholder demo-owned rows without recreating browse data

## Commands

Mobile:

```bash
npm run mobile:start
npm run mobile:ios
npm run mobile:android
npm run mobile:test
npm run mobile:doctor
```

Web:

```bash
npm run web:dev
npm run web:build
npm run web:preview
npm run web:test
```

## Runtime Notes

### Auth

- Shipped auth is email-link only.
- A user can request the sign-in link with just email, or provide an anonymous handle up front.
- If the user signs in without a handle, the app keeps setup open until a unique anonymous handle is claimed.
- Public authorship comes from the claimed handle in `user_handles` and synced auth metadata.

### Maps

- Mobile map screens mount with `initialRegion` and stay gesture-driven.
- The web map uses Leaflet and keeps its own drag/zoom runtime.
- Shared viewport filtering still limits dots to the visible map bounds, but it no longer thins visible markers based on zoom.

### Participation

- `place_votes` and `place_comment_votes` both enforce one row per `(entity, user)` pair.
- Revisiting the app rehydrates the stored vote rows, so users do not double-count by voting again after a reload.
- Replies persist through `parent_comment_id` and are rebuilt into client-side thread trees on both platforms.

## Supabase Notes

Key files:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
- [supabase/migrations/20260325093000_add_handles_and_comment_votes.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260325093000_add_handles_and_comment_votes.sql)
- [supabase/seed.sql](/Users/sirishjoshi/Desktop/Topey/supabase/seed.sql)
- [scripts/apply-supabase-sql.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/apply-supabase-sql.mjs)
- [scripts/sync-supabase-auth-config.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/sync-supabase-auth-config.mjs)

Detailed backend notes are in [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md).

## Documentation

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/MONOREPO.md](/Users/sirishjoshi/Desktop/Topey/docs/MONOREPO.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
- [CONTRIBUTING.md](/Users/sirishjoshi/Desktop/Topey/CONTRIBUTING.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)
