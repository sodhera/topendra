# Topey Architecture

## Scope

Topey is a monorepo for:

- a native Expo app in `apps/mobile`
- a browser app in `apps/web`
- a shared package in `packages/shared`

Runtime product behavior still centers on the map-driven Topey experience:

- browsing nearby places on a map
- selecting a pin and reading place details
- viewing comment threads after login on mobile
- upvoting and downvoting a place after login on mobile
- adding new places after login on mobile

## Runtime Model

## Workspace Layout

- [apps/mobile](/Users/sirishjoshi/Desktop/Topey/apps/mobile): Expo app for iOS and Android
- [apps/web](/Users/sirishjoshi/Desktop/Topey/apps/web): Vite browser app
- [packages/shared](/Users/sirishjoshi/Desktop/Topey/packages/shared): shared cross-platform data and UI tokens

### Mobile app shell

The mobile app shell is defined in [App.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/App.js).

The navigation stack is:

- `Home`
- `Browse`
- `AddPlace`

### Web app shell

The browser app shell is defined in [App.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/App.jsx).

Responsibilities:

- render the same map-first Topey shell as the app, but for desktop browsers
- project the same shared place coordinates onto a web map canvas
- maintain a clamped desktop viewport over that normalized map world
- translate drag, trackpad, wheel, pinch, double-click, and keyboard input into viewport changes
- expose the same place sheet, auth sheet, discussion sheet, and add-place flow in the browser
- talk to Supabase directly when browser env config exists, while still falling back to the shared demo dataset

### Web desktop interaction model

The browser map keeps every place projected into a normalized Kathmandu coordinate space.

On top of that world, the app stores a browser-only viewport with:

- `centerX`
- `centerY`
- `zoom`

Mechanism:

1. the world stays fixed to the Kathmandu bounds
2. the viewport translates and scales that world to render the visible map
3. the viewport is clamped so desktop panning never drifts beyond the dataset bounds
4. pointer drag updates the camera directly
5. precision wheel deltas are treated as trackpad pans, while coarse wheel movement and pinch gestures are treated as zoom
6. keyboard shortcuts mutate the same viewport state, so mouse, trackpad, and keyboard all stay behaviorally aligned
7. the desktop camera stays visually hidden behind the same full-screen app shell used by the mobile experience

### Web runtime state

The browser app keeps its own lightweight runtime in [App.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/App.jsx).

Responsibilities:

- restore the browser session from Supabase when configured
- restore or create an anonymous viewer session id in local storage
- fetch places and votes for every viewer
- fetch comments only when a session exists
- open the auth, place, discussion, composer, and add-place sheets directly from the app shell

Browser-specific backend helpers live in:

- [supabase.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/supabase.js)
- [backend.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/backend.js)
- [runtimeConfig.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/runtimeConfig.js)

### Shared package

Cross-platform source-of-truth utilities live in [packages/shared](/Users/sirishjoshi/Desktop/Topey/packages/shared).

Important shared modules:

- [theme.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/theme.js)
- [constants.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/constants.js)
- [auth.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/auth.js)
- [geo.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/geo.js)
- [demoCatalog.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/data/demoCatalog.js)

### Mobile state container

Shared mobile app state lives in [AppContext.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/context/AppContext.js).

The context is responsible for:

- restoring the Supabase session
- restoring email-link auth sessions from deep links
- loading places and votes
- loading comments only for authenticated users
- exposing auth actions
- exposing place, vote, and comment write actions

This replaced the old reducer-backed local runtime for the actual app flow.

## Screen Responsibilities

### Home

Defined in [HomeScreen.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/screens/HomeScreen.js).

Responsibilities:

- center the initial map on the resolved live location when available, with Kathmandu as the fallback
- suppress native POIs/buildings/traffic chrome so only Topey place drops compete for attention
- thin marker density as the viewport widens so wide-area views stay readable
- keep the map directly pannable without any full-screen overlay layer
- render only `Profile` or `Sign in` at the top right
- keep a single large `+` add-place button anchored at the bottom
- open the place modal directly on marker taps instead of navigating into another screen
- expose `Open location` inside that modal for every viewer
- render rating, votes, and threads as one metadata line instead of boxed stat cards
- use stemmed arrow voting under `Open location`
- show only a two-comment preview stack in the place modal
- open the full discussion in a second modal with per-comment vote/reply affordances
- use a floating add-comment action instead of an inline composer in the place modal
- expose `See More` as the large preview affordance inside the faded comment tail
- keep the top two preview comments visible for guests, but route `See More` and comment actions into the email-link auth path

The large center hero card, test-user widget, and center-floating action row are intentionally gone.

### Browse

Defined in [BrowseScreen.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/screens/BrowseScreen.js).

Responsibilities:

- render the same live-location-first map foundation as home
- keep the same decluttered mobile map configuration so only Topey pins stand out against the base map
- use the same viewport-based pin thinning as home so zoomed-out maps do not render every place at once
- show only two top controls: `Back` and `Add a place`
- display up to 50 place markers from Supabase plus the runtime demo fallback
- open a compact place preview only when a dot is tapped
- show rating, vote ratio, and thread count in that preview
- open an explicit details modal from `View more`
- expose `Open location`, simple arrow voting, and the same Reddit-style thread preview inside the details modal
- open the full conversation in a second modal from the preview stack
- keep the two-comment preview visible for guests while auth-gating the full discussion and participation actions
- expose the same email-plus-anonymous-username auth card when a guest tries to participate

### AddPlace

Defined in [AddPlaceScreen.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/screens/AddPlaceScreen.js).

Responsibilities:

- center on the resolved live location before enabling submission
- inherit the current home or browse viewport on entry so existing place pins disappear without a hard map jump
- keep the base map decluttered while still showing the user location and current pin target
- let the user move the pin by moving the map instead of dragging a controlled region prop
- render a fixed maps-style location bubble pin in the upper half of the viewport so the add target stays visible while the map moves underneath it
- keep the live overlay minimal with only `Back` and `Add here`
- open a details modal from the map-first `Add here` action
- capture the place name and description inside the modal
- require login before save
- expose email-link access directly inside the add-place details modal for guests
- insert the place into Supabase

## Auth Model

Client auth helpers live in:

- [supabase.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/lib/supabase.js)
- [auth.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/auth.js)

Mechanism:

1. The app asks Supabase for the saved session.
2. Guests can browse without a session.
3. Guests who try to add, vote, or comment see an email access card instead of OAuth or password UI.
4. The card collects only email plus an anonymous username.
5. Supabase sends a sign-in link back to `topey://auth/callback`.
6. The app restores the session from that deep link and persists it in AsyncStorage through Supabase’s React Native storage integration.

## Data Model

Remote schema lives in [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql).

Primary tables:

- `places`
- `place_votes`
- `place_comments`

### Places

Each place contains:

```js
{
  id,
  name,
  description,
  latitude,
  longitude,
  createdBy,
  authorName,
  createdAt
}
```

### Votes

Each vote contains:

```js
{
  id,
  placeId,
  userId,
  value, // 1 or -1
  createdAt
}
```

### Comments

Each comment contains:

```js
{
  id,
  placeId,
  authorId,
  authorName,
  body,
  createdAt
}
```

## Data Fetching And Writes

Backend data helpers live in [backend.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/lib/backend.js).

### Reads

- all users fetch `places`
- all users fetch `place_votes`
- only authenticated users fetch `place_comments`
- the app merges in a deterministic 50-place Kathmandu demo dataset when the backend is thin or unavailable

### Writes

- `createPlace`: inserts a new place with both `created_by` and `author_name`
- `voteForPlace`: upserts or removes the current user’s vote
- `createComment`: inserts a comment
- `createPlaceOpenEvent`: records each place open with a viewer session id and source screen

### Place Sheet Participation Row

The place details modal now exposes place participation in one compact row:

- left side: place-level upvote and downvote arrows
- right side: `Added by: <Username>` using the persisted `authorName`

This keeps authorship visible at the same moment the user chooses whether to vote, comment, or open the full discussion.

### Anonymous Public Identity

Places and comments use the session user’s anonymous username from auth metadata.

Rules:

- the app asks for email plus an anonymous username when creating access
- public surfaces use that anonymous username
- when metadata is missing, the UI falls back to `Anonymous member` instead of exposing an email-derived name

### Place Open Tracking

Open tracking now writes into `place_open_events`.

Each event stores:

- `place_id`
- `user_id` when logged in, otherwise `null`
- `viewer_session_id` from AsyncStorage so anonymous sessions still have continuity
- `source_screen`
- `opened_at`

This is the first piece of the planned area-update notification system.

## Location Handling

Location logic lives in [useLiveLocation.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/hooks/useLiveLocation.js).

Behavior:

1. Request foreground location permission.
2. Hold the initial map-centering step until the first live-location lookup resolves.
3. Use the live position for `Home`, `Browse`, and `AddPlace` when permission is granted.
4. Fall back to Kathmandu when location is unavailable.
5. Recenter only once automatically, then let the user explore the map freely.
6. Show explicit copy that location is used to center the map, show nearby places, and save added place coordinates.

## Map Gesture Model

The map screens intentionally avoid controlling `react-native-maps` with `region={...}` during ordinary drag gestures.

Mechanism:

1. Each map screen mounts the map with `initialRegion`.
2. `Home`, `Browse`, and `AddPlace` all recenter once from foreground location when permission is granted.
3. `AddPlace` starts from the current source viewport, hides place pins, then animates to the resolved live location for a smoother transition into placement mode.
4. `AddPlace` keeps the target coordinates synced to the point under the fixed upper-half overlay pin instead of the literal screen center.
5. `Home` and `Browse` derive a visible marker subset from the current viewport, bucket nearby places together, ease the marker cap down as the map zooms out, and return to full visible-pin rendering once the user is zoomed in past the density threshold.
6. User drags happen directly inside the native map view because only the actual buttons intercept touches.
7. `Home` modals and `Browse` previews both come from explicit marker taps instead of automatic map-center selection.

This keeps the interaction simple and avoids the earlier bug where the map felt locked and only tiny untouched areas seemed draggable.

## Legacy Prototype Code

The repo still contains:

- [reducer.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/lib/reducer.js)
- [seed.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/data/seed.js)

These are retained mainly for existing unit tests and historical reference. They are not the live runtime source of truth anymore.

## Verification Surface

Current verification steps:

- Jest tests
- `expo-doctor`
- Supabase management API checks for schema and seed rows

What is still not fully automated:

- device-level email-link auth on a real phone
- native map interaction on a real phone
- end-to-end comment gating smoke tests in a dev build
