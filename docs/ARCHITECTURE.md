# Topey Architecture

## Scope

Topey is an Expo-native mobile app for:

- browsing nearby places on a map
- selecting a pin and reading place details
- viewing comment threads after login
- upvoting and downvoting a place after login
- adding new places after login

This repo is no longer a local-only prototype. Runtime data now comes from Supabase.

## Runtime Model

### App shell

The app shell is defined in [App.js](/Users/sirishjoshi/Desktop/Topey/App.js).

The navigation stack is:

- `Home`
- `Browse`
- `AddPlace`

### State container

Shared app state lives in [src/context/AppContext.js](/Users/sirishjoshi/Desktop/Topey/src/context/AppContext.js).

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

Defined in [src/screens/HomeScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/HomeScreen.js).

Responsibilities:

- show the Kathmandu demo map immediately
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
- route guests into the email-link auth path instead of exposing thread content

The large center hero card, test-user widget, and center-floating action row are intentionally gone.

### Browse

Defined in [src/screens/BrowseScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/BrowseScreen.js).

Responsibilities:

- render the same Kathmandu demo map foundation as home
- show only two top controls: `Back` and `Add a place`
- display up to 50 place markers from Supabase plus the runtime demo fallback
- open a compact place preview only when a dot is tapped
- show rating, vote ratio, and thread count in that preview
- open an explicit details modal from `View more`
- expose `Open location`, simple arrow voting, and the same Reddit-style thread preview inside the details modal
- open the full conversation in a second modal from the preview stack
- gate thread content behind login and auth-gate voting/comment actions for guests
- expose the same email-plus-anonymous-username auth card when a guest tries to participate

### AddPlace

Defined in [src/screens/AddPlaceScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/AddPlaceScreen.js).

Responsibilities:

- center on the resolved live location before enabling submission
- let the user move the pin by moving the map instead of dragging a controlled region prop
- open a details modal from the map-first `Add here` action
- capture the place name and description inside the modal
- require login before save
- expose email-link access directly inside the add-place details modal for guests
- insert the place into Supabase

## Auth Model

Client auth helpers live in:

- [src/lib/supabase.js](/Users/sirishjoshi/Desktop/Topey/src/lib/supabase.js)
- [src/lib/auth.js](/Users/sirishjoshi/Desktop/Topey/src/lib/auth.js)

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

Backend data helpers live in [src/lib/backend.js](/Users/sirishjoshi/Desktop/Topey/src/lib/backend.js).

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

Location logic lives in [src/hooks/useLiveLocation.js](/Users/sirishjoshi/Desktop/Topey/src/hooks/useLiveLocation.js).

Behavior:

1. Request foreground location permission.
2. Hold the initial map-centering step until the first live-location lookup resolves.
3. Use the live position when permission is granted.
4. Fall back to Kathmandu when location is unavailable.
5. Allow screens to opt out of live recentering so the browse map can be explored freely.
6. Show explicit copy that location is used to center the map, show nearby places, and save added place coordinates.

Only `AddPlace` uses live recentering now. `Home` and `Browse` intentionally start on the Kathmandu demo region so the 50 seeded dots are visible immediately.

## Map Gesture Model

The map screens intentionally avoid controlling `react-native-maps` with `region={...}` during ordinary drag gestures.

Mechanism:

1. Each map screen mounts the map with `initialRegion`.
2. `Home` and `Browse` stay on the Kathmandu demo region.
3. `AddPlace` recenters once from foreground location.
4. User drags happen directly inside the native map view because only the actual buttons intercept touches.
5. `Home` modals and `Browse` previews both come from explicit marker taps instead of automatic map-center selection.

This keeps the interaction simple and avoids the earlier bug where the map felt locked and only tiny untouched areas seemed draggable.

## Legacy Prototype Code

The repo still contains:

- [src/lib/reducer.js](/Users/sirishjoshi/Desktop/Topey/src/lib/reducer.js)
- [src/data/seed.js](/Users/sirishjoshi/Desktop/Topey/src/data/seed.js)

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
