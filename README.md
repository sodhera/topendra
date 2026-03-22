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
  - opens on the Kathmandu demo region so the place dots are visible immediately
  - `Profile` or `Sign in` button at the top right
  - one large `+` button at the bottom that opens the add-place flow
  - tapping a dot opens the place modal directly on home instead of navigating away
  - the modal includes `Open location`, compact arrow voting, and comments for signed-in users
- Browse screen:
  - starts on the Kathmandu demo region with up to 50 demo location dots
  - `Back` button at the top left and `Add a place` at the top right
  - tapping a dot opens a native-feeling light preview card with rating, votes, and thread count
  - `View more` opens a details modal with `Open location`, compact arrow voting, and the thread view
- Add-place screen:
  - opens on the user’s current location once foreground location resolves
  - movable map with a centered pin that follows the visible location
  - `Add here` action that opens a details modal
  - modal form with name, description, and final `Add` submit for logged-in users
- Buttons and sheets now use an Apple-like iOS treatment with softer materials, system-blue actions, larger sheet geometry, and clearer action hierarchy inside modals.
- Place opens are tracked in Supabase so later area-notification work has usage history to build on.
- Demo mode now ships with 50 deterministic Kathmandu places plus multiple seeded comment threads per place.

## Map Interaction Model

- `Home` and `Browse` mount the map with `initialRegion`; they do not keep `react-native-maps` locked to a controlled `region` prop during drag gestures.
- Home and browse both stay directly draggable because only the actual buttons intercept touch events.
- Home place details open in a modal on dot tap, and browse previews also open only from explicit dot taps.
- `AddPlace` updates the pending pin from map movement and keeps the details form behind an explicit modal instead of a permanent card.

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
- `supabase:seed`: replaces the demo dataset with 50 Kathmandu places, votes, and comment threads

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
- can open the place modal from any demo dot
- can open the pinned coordinates in the native maps app
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
