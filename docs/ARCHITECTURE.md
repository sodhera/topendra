# Zazaspot Architecture

## Scope

Zazaspot is a monorepo with:

- `apps/mobile`: Expo runtime for iOS and Android
- `apps/web`: Vite + React browser runtime
- `packages/shared`: shared auth helpers, geo helpers, constants, theme tokens, and deterministic fixtures used by tests

The shipped product is map-first:

- browse visible places on a map
- open a place detail surface
- vote on places
- comment and reply
- vote on comments
- add new places
- track explicit place opens

## Runtime Model

### Mobile

The mobile shell lives in [apps/mobile/App.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/App.js).

Navigation stack:

- `Home`
- `Browse`
- `AddPlace`

Runtime state lives in [apps/mobile/src/context/AppContext.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/context/AppContext.js).

Responsibilities:

- restore the Supabase session
- restore Google auth from `zazaspot://auth/callback`
- restore or create a viewer session id
- fetch places, place votes, comments, and comment votes
- enforce anonymous-handle completion before posting places or comments
- expose write actions for places, place votes, comments, comment votes, and place-open tracking

### Web

The browser shell lives in [apps/web/src/App.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/App.jsx).

Responsibilities:

- restore the browser Supabase session
- restore or create a browser viewer session id
- fetch places, place votes, comments, and comment votes
- hydrate the shell before the first data refresh finishes so the loading screen clears faster
- keep `/places/:id` in sync with the selected place
- run Google auth and anonymous-handle completion
- keep place votes optimistic in the routed place page
- keep auth, composer, and add-place as lightweight dialogs over the map shell
- upload place photos to the public `place-photos` storage bucket before inserting the place row

Browser backend helpers live in:

- [apps/web/src/lib/supabase.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/supabase.js)
- [apps/web/src/lib/backend.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/backend.js)
- [apps/web/src/lib/runtimeConfig.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/runtimeConfig.js)

## Map Model

### Shared viewport filtering

Shared map filtering lives in [packages/shared/lib/geo.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/geo.js).

Current rule:

- only places inside the padded visible bounds are rendered
- visible places are sorted by selection, thread count, score, and recency
- zoom level no longer removes or thins visible markers

### Mobile maps

Mobile map screens use `react-native-maps`.

Mechanism:

1. mount with `initialRegion`
2. recenter once from foreground location when available
3. keep gesture ownership inside the native map view instead of controlling `region` during drag
4. render a custom current-location marker when permission is granted
5. keep add-place targeting on a fixed upper-half pin while the map moves underneath it

### Web map

The browser map lives in [apps/web/src/components/DesktopMap.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/components/DesktopMap.jsx).

Mechanism:

1. Leaflet owns drag, wheel, pinch, keyboard, and tile rendering
2. React only consumes settled viewport changes
3. place markers are canvas-backed Leaflet paths
4. markers stay hidden until the initial base-tile batch is ready
5. hover previews are anchored near the marker so the user can move into the `Open` button
6. add-place mode disables existing marker hit targets, reads the pending coordinate from the offset viewport pin, and exposes a centered `Add Place` CTA directly below that pin so placement does not rely only on the top-bar action

## Auth Model

Shared auth helpers live in [packages/shared/lib/auth.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/auth.js).

Current flow:

1. user signs in with Google through Supabase Auth
2. Supabase restores the authenticated session in the app callback
3. user may also suggest or claim an anonymous handle during setup
4. app claims a unique handle in `public.user_handles`
5. the claimed handle is synced back into auth metadata as `preferred_username`
6. public UI uses only the anonymous handle, never real-world identity fields

The apps block place creation and comment creation until the user has a valid anonymous handle.

## Participation Model

### Places

- `places` rows store `author_name` and `created_by`
- `place_votes` stores one vote row per `(place_id, user_id)`
- the web app layers optimistic place votes on top of the fetched dataset

### Comments

- `place_comments` stores top-level comments and replies through `parent_comment_id`
- `place_comment_votes` stores one vote row per `(comment_id, user_id)`
- both apps rebuild nested threads client-side from the flat comment result set

## Data Model

Primary schema files:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
- [supabase/migrations/20260325093000_add_handles_and_comment_votes.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260325093000_add_handles_and_comment_votes.sql)

Primary tables:

- `places`
- `place_votes`
- `place_comments`
- `place_comment_votes`
- `user_handles`
- `place_open_events`

## Test Fixtures

Deterministic Kathmandu fixture data still exists in:

- [packages/shared/data/demoCatalog.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/data/demoCatalog.js)
- [packages/shared/data/seed.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/data/seed.js)

These are test fixtures and historical reference now. They are not runtime fallback data.

## Verification Surface

Current verification:

- `npm run web:test`
- `npm run web:build`
- `npm run mobile:test`
- targeted local browser QA when needed
