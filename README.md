# Topey

Topey is now a monorepo with:

- `apps/mobile`: the Expo app for iOS and Android
- `apps/web`: a dedicated browser app that mirrors the live Topey map experience for desktop
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
  - `apps/web` ships a browser version of the same map-first experience, adapted for desktop input
  - `packages/shared` keeps cross-platform logic in one place
- Home screen:
  - opens near the user’s current location when foreground location is available, with the Kathmandu seeded field as the fallback
  - thins marker density as the map zooms out so wide views do not render every place pin at once
  - `Profile` or `Sign in` button at the top right
  - one large `+` button at the bottom that opens the add-place flow
  - tapping a dot opens place details immediately; on web this now routes to `/places/:id` while mobile still uses an in-map detail surface
  - the place detail surface keeps `Open location`, a vote rail, `Added by: <Username>`, and the threaded discussion together in one black-and-white layout
- Browse screen:
  - starts near the user’s current location when available, with up to 50 seeded demo dots still merged into the dataset
  - uses the same zoom-aware marker thinning so wide map views stay readable
  - `Back` button at the top left and `Add a place` at the top right
  - tapping a dot opens a native-feeling light preview card with rating, votes, and thread count
  - `View more` opens a details modal with inline metadata, a participation row that combines stemmed arrow voting with creator attribution, a stacked threaded preview, and a separate discussion modal
  - guests still see the latest two preview comments, but `See More` and comment actions route into email auth
- Add-place screen:
  - opens from the current home or browse viewport so the transition feels continuous, then auto-scrolls to the user’s current location once foreground location resolves
  - movable map with a fixed maps-style location bubble pin in the upper half of the viewport that still marks the exact add target
  - the live overlay stays minimal: just `Back` at the top and `Add here` at the bottom
  - modal form with name, description, and final `Add` submit for logged-in users
  - guest add attempts expose the same email-link auth path used by voting and comments
- User location:
  - iOS, Android, and web now render a custom Topey location marker instead of relying on the platform default blue dot
  - the location marker is a solid black circle with a smaller white dot inside it so current position still reads separately from place drops without introducing extra color
- Mobile and web now share a flatter, low-resource shell: dark primary buttons, bordered white cards, compact dialogs, and simpler marker chrome with no glow-heavy treatment.
- Place discussion now stays attached to the detail surface: the web route renders the full thread inline, while mobile still keeps a compact preview before deeper discussion affordances.
- Place opens are tracked in Supabase so later area-notification work has usage history to build on.
- Demo mode now ships with 50 deterministic Kathmandu places plus multiple seeded comment threads per place.
- Account creation is email-only and asks the user to choose an anonymous public username for places and comments.
- Location data is used to center the map, show nearby place drops, and save the coordinates of places the user adds.
- Web now exists as a dedicated app in `apps/web`; it mirrors the map-first shell in the browser with routed place pages, lightweight overlays, and the same add-place flow on top of a real tile map.
- The browser map now has desktop-first controls under that same shell: drag panning, two-finger trackpad panning, wheel/pinch zoom, double-click zoom, keyboard map movement, and keyboard place traversal.
- On web, place details now live at `/places/:id` as a dedicated full page; auth, composer, and add-place remain lightweight dialogs over the map shell.
- The web place page now reads like a thread: one post card, one comments card, strong display type, and a warm gradient background instead of a flat white modal transplant.
- When any browser dialog is open, the background shell is now dimmed and removed from the accessibility tree so the map HUD and floating actions do not compete with the active task.
- Browser add-place mode now visually softens the existing place dots, disables their hit targets, and uses a single outline pin icon while the user is positioning a new drop.
- The Leaflet runtime now re-invalidates layout on viewport resize, browser zoom, and tab re-entry so the map stays aligned when the visible browser space changes.
- The browser map also runs without tile post-processing, keeps Leaflet’s default zoom feel, leans harder on shared pin thinning as the viewport widens, and serves lower-density tiles until the user zooms in close enough to benefit from higher-detail raster images.
- Web replies now persist a real `parent_comment_id`, so refreshes keep the same nested thread shape instead of flattening replies back into the main comment list.
- After a successful browser add-place submit, the UI now reopens the new place from the freshly refreshed dataset instead of trying to resolve it from stale pre-refresh state.

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
- Mobile screens render a custom rainbow location marker when permission is granted, instead of the native `showsUserLocation` dot.
- Home and browse both stay directly draggable because only the actual buttons intercept touch events.
- Mobile map views intentionally suppress native POIs, buildings, indoor labels, traffic, and toolbar chrome so Topey pins are the only location layer that stands out.
- Home and browse derive a visible marker subset from the current viewport, ease marker density down as the map zooms out, and switch back to full visible-pin rendering once the user is zoomed in far enough.
- Mobile home place details open in a modal on dot tap, while the web map routes explicit dot taps into `/places/:id`.
- `AddPlace` updates the pending coordinates from map movement and uses a fixed center pin overlay so the target never disappears.
- `apps/web` uses a real browser map surface, derives a region-like viewport from settled Leaflet bounds, and feeds that viewport back into the shared place-thinning logic so desktop drag, wheel, trackpad, and keyboard inputs all stay aligned with marker density without forcing React to repaint on every drag tick.
- Web place drops now render as canvas-backed Leaflet circle markers instead of DOM markers so zoomed-out views stay responsive even when more places are visible at once.
- Web add-place mode only syncs the pinned coordinates after the viewport settles, which keeps drag and zoom interactions snappy while preserving the exact upper-half pin target.
- The browser base map now uses a muted no-label tile set so external landmarks, POIs, and icons do not compete with Topey pins.

## Tech Stack

- Expo SDK `54`
- React Native
- React DOM
- React Navigation native stack
- Leaflet
- React Leaflet
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
The browser Vite app also reads that same repo-root `.env`, so web auth and browser-side Supabase calls should not require a second env file under `apps/web`.

3. Sync the Supabase project

```bash
npm run supabase:auth
npm run supabase:migrate
npm run supabase:seed
```

What these do:

- `supabase:auth`: keeps the mobile redirect URL at `topey://auth/callback` and allow-lists local web redirects like `http://localhost:5173/**` plus the current machine's LAN dev URLs for browser OAuth
- `supabase:migrate`: creates the `places`, `place_votes`, and `place_comments` tables with RLS
- `supabase:seed`: replaces the demo dataset with 50 Kathmandu places, votes, and comment threads
- the browser fallback catalog intentionally uses the same deterministic UUID ids as `supabase:seed`, so demo-backed place cards and seeded backend rows collapse into one identity and stay writable

If you need a deployed web origin in the Supabase redirect allow-list, set `WEB_AUTH_REDIRECT_URLS` in the repo-root `.env` before running `npm run supabase:auth`. Use a comma-separated list such as `https://your-web-app.example.com/**`.

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
npm run web:test
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

- can open the same full-screen Topey map shell in the browser
- sees real map tiles behind the app shell instead of the old placeholder browser canvas
- sees the same custom location marker language as mobile when browser geolocation is available
- can drag the map, pan with a trackpad, zoom with wheel or pinch, and double-click to zoom in
- can use arrow keys to pan, `Page Up` and `Page Down` to change the selected place, and `0` to reset the camera
- can click place dots and land on a dedicated `/places/:id` page with creator attribution, voting, `Open location`, and the full threaded discussion inline
- can sign in from the browser when Supabase is configured
- can vote, post comments, and add places from the browser when signed in
- can open the selected place in external maps
- falls back to the seeded Kathmandu demo dataset when Supabase is unavailable

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
