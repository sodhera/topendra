# Topey

Topey is now a monorepo with:

- `apps/mobile`: the Expo app for iOS and Android
- `apps/web`: a dedicated browser app for browsing the Kathmandu place field
- `packages/shared`: shared demo data, theme tokens, auth helpers, and map utilities

The product centers on exploring nearby places on a live map, selecting pinned locations, reading discussion threads, and contributing new places after signing in.

The app is now backed by Supabase for:

- place storage
- vote storage
- comment storage
- session persistence
- email-link sign-in
- anonymous public usernames
- place-open tracking

## Repo

GitHub: [SurazKhati/topey](https://github.com/SurazKhati/topey)

Clone:

```bash
git clone https://github.com/SurazKhati/topey.git
cd topey
```

## Current Product Shape

- Monorepo:
  - `apps/mobile` ships the live mobile experience
  - `apps/web` ships a browser version focused on browsing and inspecting place drops
  - `packages/shared` keeps cross-platform logic in one place
- Home screen:
  - opens near the user’s current location when foreground location is available, with the Kathmandu seeded field as the fallback
  - `Profile` or `Sign in` button at the top right
  - one large `+` button at the bottom that opens the add-place flow
  - tapping a dot opens the place modal directly on home instead of navigating away
  - the modal uses a single metadata line, `Open location`, a participation row with stemmed arrow voting plus `Added by: <Username>`, and a Reddit-style thread preview
- Browse screen:
  - starts near the user’s current location when available, with up to 50 seeded demo dots still merged into the dataset
  - `Back` button at the top left and `Add a place` at the top right
  - tapping a dot opens a native-feeling light preview card with rating, votes, and thread count
  - `View more` opens a details modal with inline metadata, a participation row that combines stemmed arrow voting with creator attribution, a stacked thread preview, and a separate discussion modal
  - guests still see the latest two preview comments, but `See More` and comment actions route into email auth
- Add-place screen:
  - opens on the user’s current location once foreground location resolves
  - movable map with a fixed red pin overlay that sits in the upper half of the viewport and still marks the exact add target
  - `Add here` action that opens a details modal
  - modal form with name, description, and final `Add` submit for logged-in users
  - guest add attempts expose the same email-link auth path used by voting and comments
- Buttons and sheets now use an Apple-like iOS treatment with a white/black/grey palette, larger sheet geometry, and clearer action hierarchy inside modals.
- Place discussions now behave more like Reddit: the place sheet shows a short preview stack, while the full conversation opens in a separate modal with per-comment reply controls.
- Place opens are tracked in Supabase so later area-notification work has usage history to build on.
- Demo mode now ships with 50 deterministic Kathmandu places plus multiple seeded comment threads per place.
- Account creation is email-only and asks the user to choose an anonymous public username for places and comments.
- Location data is used to center the map, show nearby place drops, and save the coordinates of places the user adds.
- Web now exists as a dedicated app in `apps/web`; it reuses the shared Kathmandu dataset and lets users inspect place metadata, votes, and thread previews in the browser.

## Workspace Layout

```text
apps/
  mobile/   Expo app for iOS and Android
  web/      Vite browser app
packages/
  shared/   Shared data, theme, auth helpers, and geo utilities
```

## Map Interaction Model

- `Home` and `Browse` mount the map with `initialRegion`; they do not keep `react-native-maps` locked to a controlled `region` prop during drag gestures.
- `Home`, `Browse`, and `AddPlace` all request foreground location so the app can open near the user anywhere, not only around the Kathmandu seed region.
- Home and browse both stay directly draggable because only the actual buttons intercept touch events.
- Mobile map views intentionally suppress native POIs, buildings, indoor labels, traffic, and toolbar chrome so Topey pins are the only location layer that stands out.
- Home place details open in a modal on dot tap, and browse previews also open only from explicit dot taps.
- `AddPlace` updates the pending coordinates from map movement and uses a fixed center pin overlay so the target never disappears.

## Tech Stack

- Expo SDK `54`
- React Native
- React DOM
- React Navigation native stack
- `react-native-maps`
- `expo-location`
- Supabase JS
- Expo Auth Session / Linking
- Vite
- npm workspaces
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

The monorepo keeps `.env` at the repo root. Mobile Expo config and the Supabase admin scripts load that root `.env` automatically, so you do not need to duplicate secrets into `apps/mobile`.

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

## Running The Apps

Mobile:

```bash
npm run mobile:start
npm run mobile:ios
npm run mobile:android
npm run mobile:test
npm run mobile:doctor
```

The root `npm start` command forwards into `apps/mobile`. The repo also keeps a root [App.js](/Users/sirishjoshi/Desktop/Topey/App.js) shim so Expo’s default entry resolution still lands in the mobile app if Metro is started from the monorepo root by mistake.

Web:

```bash
npm run web:dev
npm run web:build
npm run web:preview
```

## How The App Behaves

### Mobile guest

- can open the map and roam around pins
- sees the map open near the current device location when permission is granted
- can read place metadata
- can open the place modal from any demo dot
- can open the pinned coordinates in the native maps app
- can preview the latest two seeded comments in the place sheet
- still hits email auth before opening the full discussion or posting
- cannot vote
- cannot save new places

### Mobile logged-in user

- can sign in or make an account using only email plus an anonymous username
- sees home, browse, and add-place open near the current device location when permission is granted
- can read comments
- can add comments
- can upvote or downvote
- can see who added each place directly in the place sheet
- can pin the current map location, open the add-details modal, and save a new place

### Web user

- can browse the Kathmandu place field in the browser
- can click place dots and inspect metadata, creator attribution, and thread previews
- can open the selected place in external maps
- does not yet submit places or post comments from the browser

## Email Access Notes

The mobile app uses the custom scheme `topey://auth/callback`.

Important:

- the app sends a Supabase email sign-in link to the address the user enters
- new accounts also store the chosen anonymous username in auth metadata
- returning to the app through the email link restores the session in-app

## Privacy Notes

- Topey only asks end users for email plus an anonymous username
- place and comment authorship is shown using the anonymous username, not the raw email address
- foreground location is used to center the mobile maps near the user, show nearby map context, and save place coordinates when a user adds a drop
- each place open is tracked with a viewer session id for future area notifications

## Supabase Notes

Schema and auth helper scripts live in:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
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
