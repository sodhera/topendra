# Topey

Topey is an Expo mobile app for exploring nearby places on a live map, selecting pinned locations, reading discussion threads, and contributing new places after signing in.

The app is now backed by Supabase for:

- place storage
- vote storage
- comment storage
- session persistence
- OAuth sign-in with Google and Facebook

## Repo

GitHub: [SurazKhati/topey](https://github.com/SurazKhati/topey)

Clone:

```bash
git clone https://github.com/SurazKhati/topey.git
cd topey
```

## Current Product Shape

- Home screen:
  - live map background
  - no large hero card
  - Google and Facebook sign-in buttons for guests
  - `Find a place` button that opens the explorable browse map
- Browse screen:
  - free-roam map
  - multiple seeded place pins
  - place widget with name, description, distance, vote ratio, and comments
  - comments visible only to logged-in users
- Add-place screen:
  - draggable marker
  - place name and description form
  - save-to-Supabase flow for logged-in users

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
- can read comments
- can add comments
- can upvote or downvote
- can save a new pinned place

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
