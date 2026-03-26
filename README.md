# Zazaspot

Zazaspot is a map-first monorepo with:

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
- Google auth
- place-open tracking

The web app is also instrumented for analytics through:

- Vercel Web Analytics for visitors and page views on the deployed site
- Supabase for product-event tracking inside the app
- autocaptured clicks and button interactions
- custom funnel events for auth, handle claim, add-place, save, comment, and vote flows
- first-party event storage in SQL

## Repo

GitHub: [sodhera/topendra](https://github.com/sodhera/topendra)

```bash
git clone https://github.com/sodhera/topendra.git
cd topendra
```

## Current Product Shape

- Both apps are live-data clients. Demo fixtures remain in `packages/shared/data` for tests, not for runtime fallback.
- The mobile and web maps now keep every visible place dot; wide zoom levels do not thin or drop markers anymore.
- The web app still deep-links place details at `/places/:id`, but renders them as a left-side map overlay so the map stays interactive while researching multiple places.
- The mobile app still opens place details inside native modal surfaces.
- Web add mode now uses a draggable red pin plus a bottom `Add Place` CTA, so the placement flow stays anchored to the map instead of the center of the viewport.
- Places now store a single tag. Add-place uses `Zaza Spots`, `Zaza Friendly Restaurants`, or `Custom`, and the home map can filter visible places by those tag families.
- Web add-place also supports image uploads backed by Supabase Storage.
- The web shell includes an instant light/dark toggle and keeps the loading copy on the splash state instead of the live map HUD.
- The web shell also exposes an icon-only feedback action that opens an in-app modal and stores submissions in Supabase.
- The web shell now emits Supabase-backed analytics for routed screen views, auth funnels, place detail opens, adds, saves, comments, votes, tag-filter usage, and button/link clicks.
- Place discussions support:
  - top-level comments
  - replies through `parent_comment_id`
  - one vote row per user per place
  - one vote row per user per comment
- Browser place votes are optimistic in the UI.
- Account setup is anonymous-by-default:
  - users sign in with Google auth
  - users claim a unique anonymous handle for public activity
  - public UI never falls back to real-world identity fields
  - the product discloses that email is processed by Google and Supabase Auth for sign-in, but never shown publicly inside Zazaspot
- Placeholder demo/team place rows are removed by the seed cleanup path instead of being recreated.

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

Production web auth note:

- set `WEB_SITE_URL` to the canonical browser origin, for example `https://zazaspot.com`
- set `WEB_AUTH_REDIRECT_URLS` to every browser callback origin you serve, for example `https://zazaspot.com/**,https://www.zazaspot.com/**`
- `npm run supabase:auth` pushes those values into Supabase Auth allow-lists

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

- Shipped auth uses Google sign-in through Supabase Auth.
- The auth provider processes the user email for sign-in and session recovery.
- The product never shows the email publicly in places, comments, or profile surfaces.
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
- [docs/ANALYTICS.md](/Users/sirishjoshi/Desktop/Topey/docs/ANALYTICS.md)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
- [CONTRIBUTING.md](/Users/sirishjoshi/Desktop/Topey/CONTRIBUTING.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)
