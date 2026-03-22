# Topey

Topey is a minimal Expo mobile app for finding nearby places on a live map, voting on them, commenting on them, and adding new places by dropping a pin.

The current app is intentionally small:

- a home screen with a live map in the background
- a `Find a place` flow for browsing markers inside the app
- an `Add a place` flow for dropping a pin and saving a location
- a lightweight demo login toggle that gates votes and comments

This repo currently ships a local-first prototype. There is no backend, no real auth provider, and no server sync yet.

## Repo

GitHub: [SurazKhati/topey](https://github.com/SurazKhati/topey)

Clone:

```bash
git clone https://github.com/SurazKhati/topey.git
cd topey
```

## Product Overview

### What exists today

- Live native map background on the home screen
- Small `Add a place` button near the top
- Large `Find a place` button near the bottom
- Browse screen with:
  - live map
  - place markers
  - upvote / downvote controls
  - comments
- Add-place screen with:
  - tap-to-drop pin
  - draggable marker
  - place name
  - place description
- Guest/demo-user switching
- Local persistence through AsyncStorage

### Current limitations

- Votes and comments are local to the device
- “Login” is only a local demo toggle
- Places are seeded locally, not synced from a server
- There is no moderation or admin backend in the current app
- There is no search, filtering, or map clustering yet

## Tech Stack

- Expo SDK `54`
- React Native
- JavaScript
- React Navigation native stack
- `react-native-maps`
- `expo-location`
- AsyncStorage
- Jest

## Quick Start

### 1. Install dependencies

```bash
npm install
```

If this shell does not already have `node` and `npm` on the path, use the local wrapper:

```bash
./scripts/with-local-node.sh npm install
```

### 2. Start the Expo app

```bash
npm run start
```

Or:

```bash
./scripts/with-local-node.sh npm run start
```

### 3. Open it

You can run it in:

- Expo Go on a phone
- iOS simulator
- Android emulator
- Expo web

Useful scripts:

```bash
npm run start
npm run ios
npm run android
npm run web
npm run test
```

## How To Use The App

### Home

- The map background tries to center on the device’s current location.
- `Add a place` opens the add-place flow.
- `Find a place` opens the browse flow.
- `Demo login` switches to the local logged-in demo user.
- `Use guest` switches back to guest mode.

### Browse

- Pan and zoom the map like a normal map app.
- Tap a marker or chip to focus a place.
- Upvote or downvote a place if logged in.
- Add comments if logged in.

### Add a place

- Tap the map or drag the marker to the exact location.
- Enter a place name.
- Enter a short description.
- Save the place into the local store.

## Development

### Tests

Run the current test suite:

```bash
npm run test -- --runInBand
```

Covered today:

- reducer behavior for places, votes, and comments
- auth helpers for guest vs demo user
- geo helpers for scoring, sorting, and distance

### Docs

The main repo docs are:

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [CONTRIBUTING.md](/Users/sirishjoshi/Desktop/Topey/CONTRIBUTING.md)
- [docs/README.md](/Users/sirishjoshi/Desktop/Topey/docs/README.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)

### Repo structure

```text
App.js
src/
  components/
  context/
  data/
  hooks/
  lib/
  screens/
docs/
__tests__/
assets/
scripts/
```

## Roadmap

Likely next steps:

- real authentication
- backend sync
- place search
- basic filters
- richer map UX

## Status

This repo is an actively evolving prototype, not a production-ready app.
