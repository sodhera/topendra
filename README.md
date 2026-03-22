# Topey

Topey is a minimal Expo mobile app for finding nearby places on a live map, voting on them, commenting on them, and adding new places by dropping a pin. The app uses local demo state only. There is no backend or real authentication yet.

## Current Product

- Home screen with a live native map in the background
- Small `Add a place` button near the top
- Large `Find a place` button near the bottom
- Browse screen with a full in-app map, map markers, vote controls, and comments
- Add-place screen with tap-to-drop or drag-to-place pin selection
- Guest/demo login toggle
- Votes and comments gated to the demo logged-in user
- Local persistence through AsyncStorage

## Tech Stack

- Expo SDK `54`
- React Native + JavaScript
- React Navigation native stack
- `react-native-maps` for the in-app Apple Maps / Google Maps view
- `expo-location` for live user location
- AsyncStorage for local persistence
- Jest for reducer and helper coverage

## Install

```bash
npm install
```

If `node` or `npm` is not on your shell path in this workspace:

```bash
./scripts/with-local-node.sh npm install
```

## Run

```bash
npm run start
```

If you need the local Node wrapper:

```bash
./scripts/with-local-node.sh npm run start
```

Useful Expo commands:

- `npm run ios`
- `npm run android`
- `npm run web`

## Using The App

### Home

- The background map tries to center on the device’s current location.
- `Add a place` opens the add flow.
- `Find a place` opens the browse flow.
- `Demo login` switches from guest mode to the local demo user.
- `Use guest` switches back to read-only mode.

### Browse

- Pan and zoom the map like a normal maps app.
- Tap markers or chips to focus a place.
- Upvote and downvote a place.
- Add comments if the app is in demo logged-in mode.

### Add A Place

- Tap the map or drag the marker to the exact location.
- Fill in a name and description.
- Save the place into the local place list.

## Development Notes

- This is a local-first prototype. Restarting the app preserves state because it is stored in AsyncStorage.
- Votes and comments are deliberately local and fake-auth for now. Real auth and backend sync do not exist yet.
- The map is provider-backed through `react-native-maps`, so iOS uses Apple Maps and Android uses Google Maps.

## Test

```bash
npm run test
```

Or with the local Node wrapper:

```bash
./scripts/with-local-node.sh npm run test
```

## Docs

- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)
