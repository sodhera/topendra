# Topey Architecture

## Scope

This repo currently implements a small Expo-native product:

- show a live in-app map
- center it on the user when location permission is granted
- browse nearby places inside the app
- let logged-in users upvote, downvote, and comment
- let any user add a place by dropping a pin and entering a name and description

There is no backend, no real auth system, and no server persistence.

## Navigation

The app uses a single native stack:

- `Home`
- `Browse`
- `AddPlace`

The home screen is only an entry surface. The browse and add screens contain the real working flows.

## State Model

Reducer-backed local state lives in [src/context/AppContext.js](/Users/sirishjoshi/Desktop/Topey/src/context/AppContext.js) and is persisted to AsyncStorage.

Stored records:

- `currentUserId`
- `users`
- `places`
- `comments`
- `votes`

### Place shape

Each place is intentionally simple:

```js
{
  id,
  name,
  description,
  latitude,
  longitude,
  createdBy,
  createdAt
}
```

### Comment shape

```js
{
  id,
  placeId,
  authorId,
  body,
  createdAt
}
```

### Vote shape

```js
{
  id,
  placeId,
  userId,
  value // 1 or -1
}
```

## Auth Model

Auth is intentionally fake and local for now.

- `guest`: can browse and add places
- `demo-user`: can browse, add places, vote, and comment

The login toggle on the home screen only switches `currentUserId` in local state.

## Live Location

The location mechanism lives in [src/hooks/useLiveLocation.js](/Users/sirishjoshi/Desktop/Topey/src/hooks/useLiveLocation.js).

Behavior:

1. Request foreground location permission.
2. If granted, fetch the current position.
3. Start a watcher to keep the region updated.
4. If denied or failed, fall back to Kathmandu.

This hook is used by:

- the home map background
- the browse map
- the add-place map

## Map Rendering

Map rendering uses `react-native-maps`.

- iOS: Apple Maps
- Android: Google Maps

The app uses:

- user location marker
- normal map panning and zooming
- place markers
- tap-to-select behavior on browse
- tap-to-drop / drag-to-adjust marker on add

## Write Paths

### Add a place

Defined in [src/screens/AddPlaceScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/AddPlaceScreen.js).

Flow:

1. User taps the map or drags the marker.
2. User enters a name and description.
3. `add_place` action inserts a new place record into local state.

### Vote on a place

Defined by the `vote_place` reducer action.

Rules:

- guest votes are ignored
- logged-in users can upvote or downvote
- tapping the same vote again removes it
- changing vote direction updates the existing record

### Comment on a place

Defined by the `add_comment` reducer action.

Rules:

- guest comments are ignored
- empty comments are ignored
- valid comments are prepended to the place’s comment list

## Persistence

- Storage key: `topey-mobile-state-v2`
- Seed data comes from [src/data/seed.js](/Users/sirishjoshi/Desktop/Topey/src/data/seed.js)
- Hydration happens once on app boot
- Any state change after hydration is written back to AsyncStorage

## Main Source Files

- [App.js](/Users/sirishjoshi/Desktop/Topey/App.js): app shell and navigation
- [src/context/AppContext.js](/Users/sirishjoshi/Desktop/Topey/src/context/AppContext.js): reducer and persistence
- [src/lib/reducer.js](/Users/sirishjoshi/Desktop/Topey/src/lib/reducer.js): state transitions
- [src/lib/geo.js](/Users/sirishjoshi/Desktop/Topey/src/lib/geo.js): score, comment sorting, region helpers, distance
- [src/hooks/useLiveLocation.js](/Users/sirishjoshi/Desktop/Topey/src/hooks/useLiveLocation.js): permission + live map region
- [src/screens/HomeScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/HomeScreen.js): map-backed landing screen
- [src/screens/BrowseScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/BrowseScreen.js): browsing, votes, comments
- [src/screens/AddPlaceScreen.js](/Users/sirishjoshi/Desktop/Topey/src/screens/AddPlaceScreen.js): add-place flow
