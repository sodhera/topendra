# Topey

Topey is an Expo mobile app for exploring nearby places on a live map, selecting pinned locations, reading discussion threads, and contributing new places after signing in.

The app is now backed by Supabase for:

- place storage
- vote storage
- comment storage
- session persistence
- OAuth sign-in with Google and Facebook
- email/password sign-in fallback

## Repo

GitHub: [SurazKhati/topey](https://github.com/SurazKhati/topey)

Clone:

```bash
git clone https://github.com/SurazKhati/topey.git
cd topey
```

## Current Product Shape

- Home screen:
  - live Kathmandu map background that can be panned and zoomed immediately
  - no large profile widget sitting over the map
  - compact glass controls for sign-in, sign-out, and add-place
  - dragging the map enters `Find a place` mode automatically
- Browse screen:
  - same map system as home, but starts in browse mode with a back button
  - multiple seeded place pins in Kathmandu
  - map pins stay minimized while the map is moving and expand after 2 seconds of idle time
  - compact liquid-glass place preview with an explicit details modal
- Add-place screen:
  - opens on the user’s current location once foreground location resolves
  - movable map with a centered pin that follows the visible location
  - `Add here` action that opens a details modal
  - modal form with name, description, and final `Add` submit for logged-in users
- Buttons and overlays now use a translucent liquid-glass treatment and springy motion.
- Place opens are tracked in Supabase so later area-notification work has usage history to build on.

## Tech Stack

- Expo SDK `54`
- React Native
- React Navigation native stack
- `react-native-maps`
- `expo-location`
- Supabase JS
- Expo Auth Session / Web Browser
- Jest

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

Do not commit `.env`.

3. Sync the Supabase project

```bash
npm run supabase:auth
npm run supabase:migrate
npm run supabase:seed
```

What these do:

- `supabase:auth`: sets the mobile redirect URL to `topey://auth/callback`
- `supabase:migrate`: creates the `places`, `place_votes`, and `place_comments` tables with RLS
- `supabase:seed`: inserts the starter pins, votes, and comments

## Running The App

Start Expo:

```bash
npm run start
```

Useful scripts:

```bash
npm run start
npm run ios
npm run android
npm run test -- --runInBand
npx expo-doctor
npm run supabase:test-user
```

## How The App Behaves

### Guest

- can open the map and roam around pins
- can read place metadata
- cannot read comments
- cannot vote
- cannot save new places

### Logged-in user

- can sign in with Google or Facebook
- can sign in with email/password
- can read comments
- can add comments
- can upvote or downvote
- can pin the current map location, open the add-details modal, and save a new place

### Test account

The home screen is prefilled with a working test login:

```text
Email: testuser@topey.app
Password: TopeyTest123!
```

## OAuth Notes

The mobile app uses the custom scheme `topey://auth/callback`.

Important:

- mobile OAuth should be tested in a dev build or standalone build, not treated as guaranteed inside every Expo Go setup
- the repo is wired for Google and Facebook buttons, but the Supabase dashboard must still contain valid provider credentials for those providers to succeed end-to-end

## Supabase Notes

Schema and auth helper scripts live in:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
- [supabase/seed.sql](/Users/sirishjoshi/Desktop/Topey/supabase/seed.sql)
- [scripts/apply-supabase-sql.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/apply-supabase-sql.mjs)
- [scripts/sync-supabase-auth-config.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/sync-supabase-auth-config.mjs)

Detailed backend notes are in [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md).

## Documentation

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md)
- [CONTRIBUTING.md](/Users/sirishjoshi/Desktop/Topey/CONTRIBUTING.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)
