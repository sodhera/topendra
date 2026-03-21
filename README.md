# Topey

Topey is a mobile-first Expo app for finding moderator-approved smoke-friendly places in Kathmandu. The product is built around one core promise: reduce anxiety by showing clear rules, recent proof, and trust signals before someone leaves the house.

## What Exists

- Map-first discover flow with approved places only
- Place detail screens with rules, trust score, proof, reviews, and audit history
- Place submission flow with drafts, optional photos, and tap-to-drop pin selection
- Moderator queue with the five-state workflow
- Demo personas for guest, member, trusted scout, and moderator
- Trusted-user live edits with append-only audit logging
- Local persistence through AsyncStorage so the demo survives reloads

## Stack

- Expo SDK 55
- React Native + JavaScript
- React Navigation
- AsyncStorage for local persistence
- Expo Image Picker for optional photos
- Jest / jest-expo for logic coverage

## Local Setup

### 1. Install Node LTS

Expo requires Node LTS. This build was created against Node `24.14.0`.

If Node is already available:

```bash
node -v
npm -v
```

If not, install an official Node LTS release from [nodejs.org](https://nodejs.org/).

### 2. Install dependencies

```bash
npm install
```

On this machine specifically, Node was bootstrapped into `~/.local/node-v24.14.0-darwin-arm64/` because no system Node was installed. If your shell still cannot find `node` or `npm`, use the wrapper script from the repo root:

```bash
./scripts/with-local-node.sh npm install
```

### 3. Run the app

```bash
npm run start
```

If `npm` is not on your shell path:

```bash
./scripts/with-local-node.sh npm run start
```

Then choose one of:

- `i` for iOS simulator
- `a` for Android emulator
- scan the QR code with Expo Go

## Test

```bash
npm run test
```

Or, on this machine:

```bash
./scripts/with-local-node.sh npm run test
```

## Demo Flow

Use the Profile tab to switch personas:

- `Guest explorer`: browse approved places only
- `Maya`: submit places, write reviews, vote on reliability
- `Sagar`: all member actions plus live edit approved places
- `Anika`: moderator queue access and trust-role management

## Docs

- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/MODERATION_RUBRIC.md](/Users/sirishjoshi/Desktop/Topey/docs/MODERATION_RUBRIC.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)

## Notes

- The current app is a rich local prototype. There is no backend, auth provider, or production database yet.
- The map is a stylized faux-map surface rather than a provider-backed map. That keeps the Expo prototype stable while still validating the core map-first interaction.
- Public visibility is modeled correctly: only approved places appear in Discover.
