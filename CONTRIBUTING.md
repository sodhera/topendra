# Contributing

## Working Style

This repo is documented aggressively on purpose. If you change the product shape, developer flow, or architecture, update the docs in the same change.

The current documentation spine is:

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/README.md](/Users/sirishjoshi/Desktop/Topey/docs/README.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [CLAUDE.md](/Users/sirishjoshi/Desktop/Topey/CLAUDE.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)

## Setup

Install dependencies:

```bash
npm install
```

If the machine does not have Node on the shell path:

```bash
./scripts/with-local-node.sh npm install
```

Run the app:

```bash
npm run start
```

Run tests:

```bash
npm run test -- --runInBand
```

## Contribution Rules

### 1. Keep the app simple

The current product is intentionally minimal:

- live map-backed home screen
- browse flow
- add-place flow
- demo login gate for votes/comments

Do not reintroduce old trust-heavy or moderation-heavy product machinery unless the product direction changes explicitly.

### 2. Keep docs current

If you change:

- navigation
- state model
- auth behavior
- storage keys
- design direction
- setup instructions

update the relevant docs before finishing.

### 3. Prefer small commits

This repo wants frequent commits. Prefer:

- one commit for product code
- one commit for docs sync
- one commit for runtime bug fixes

instead of rolling unrelated changes together.

### 4. Verify changes

At minimum, run:

```bash
npm run test -- --runInBand
```

For Expo/runtime-sensitive changes, also run:

```bash
npx expo-doctor
```

### 5. Keep native assumptions explicit

This is an Expo native app. If you add a dependency that needs:

- native permissions
- app config changes
- platform-specific behavior

document that clearly in [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md) and the root [README.md](/Users/sirishjoshi/Desktop/Topey/README.md).

## Current Quality Bar

- clean README for GitHub visitors
- developer docs for repo contributors
- architecture docs that match the real code
- passing tests
- no stale product claims in docs
