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
- loading places and votes
- loading comments only for authenticated users
- exposing auth actions
- exposing place, vote, and comment write actions

This replaced the old reducer-backed local runtime for the actual app flow.

## Screen Responsibilities

### Home

Defined in [src/screens/HomeScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/HomeScreen.js).

Responsibilities:

- show the live map background and keep it pannable
- show the current auth state
- offer Google and Facebook sign-in to guests
- send the user into the browse map

The large center hero card from the earlier prototype is intentionally gone.

### Browse

Defined in [src/screens/BrowseScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/BrowseScreen.js).

Responsibilities:

- render the free-roam map
- keep the initial viewport on the Kathmandu demo region
- display multiple place markers from Supabase
- focus the selected place
- collapse markers into a smaller capsule while the map is moving, then spring them back
- show the place widget:
  - name
  - description
  - distance from user
  - upvote/downvote ratio
  - comments
- gate comments behind login

### AddPlace

Defined in [src/screens/AddPlaceScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/AddPlaceScreen.js).

Responsibilities:

- center on the resolved live location before enabling submission
- let the user move the pin by moving the map
- open a details modal from the map-first `Add here` action
- capture the place name and description inside the modal
- require login before save
- insert the place into Supabase

## Auth Model

Client auth helpers live in:

- [src/lib/supabase.js](/Users/sirishjoshi/Desktop/Topey/src/lib/supabase.js)
- [src/lib/auth.js](/Users/sirishjoshi/Desktop/Topey/src/lib/auth.js)

Mechanism:

1. The app asks Supabase for the saved session.
2. Guests can browse without a session.
3. Google and Facebook buttons call `signInWithOAuth`.
4. The OAuth redirect returns to `topey://auth/callback`.
5. The session is persisted in AsyncStorage through Supabase’s React Native storage integration.

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

### Writes

- `createPlace`: inserts a new place
- `voteForPlace`: upserts or removes the current user’s vote
- `createComment`: inserts a comment

## Location Handling

Location logic lives in [src/hooks/useLiveLocation.js](/Users/sirishjoshi/Desktop/Topey/src/hooks/useLiveLocation.js).

Behavior:

1. Request foreground location permission.
2. Hold the initial map-centering step until the first live-location lookup resolves.
3. Use the live position when permission is granted.
4. Fall back to Kathmandu when location is unavailable.
5. Allow screens to opt out of live recentering so the browse map can be explored freely.

The screens now use the live region for distance and add-place setup, but the browse and home maps are not locked to it. That keeps the Kathmandu demo markers visible and still lets the user move the map by hand.

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

- device-level OAuth success on both providers
- native map interaction on a real phone
- end-to-end comment gating smoke tests in a dev build
