# Contributing

## Working Style

This repo is documented aggressively on purpose. If you change the product shape, developer flow, architecture, or backend wiring, update the docs in the same change.

The current documentation spine is:

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/README.md](/Users/sirishjoshi/Desktop/Topey/docs/README.md)
- [docs/MONOREPO.md](/Users/sirishjoshi/Desktop/Topey/docs/MONOREPO.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md)
- [docs/ANALYTICS.md](/Users/sirishjoshi/Desktop/Topey/docs/ANALYTICS.md)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
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
npm run mobile:start
npm run web:dev
```

Run tests:

```bash
npm run mobile:test
```

Sync the backend project when auth or schema changes:

```bash
npm run supabase:auth
npm run supabase:migrate
npm run supabase:seed
```

## Contribution Rules

### 1. Keep the app simple

The current product is intentionally minimal:

- live map-backed home screen
- browse flow
- add-place flow
- read-only browser companion
- Supabase-backed login for comments, voting, and place submission

Do not reintroduce old trust-heavy or moderation-heavy product machinery unless the product direction changes explicitly.

### 2. Keep docs current

If you change:

- navigation
- state model
- auth behavior
- Supabase schema or auth scripts
- design direction
- setup instructions

update the relevant docs before finishing.

### 3. Prefer small commits

This repo wants frequent commits. Prefer:

- one commit for backend and infrastructure wiring
- one commit for product code
- one commit for docs sync
- one commit for runtime bug fixes

instead of rolling unrelated changes together.

### 4. Verify changes

At minimum, run:

```bash
npm run mobile:test
```

For Expo/runtime-sensitive changes, also run:

```bash
npm run mobile:doctor
npm run web:build
```

When changing the backend contract, also verify the remote project state with the Supabase management API scripts.

### 5. Keep native assumptions explicit

This is an Expo native app. If you add a dependency that needs:

- native permissions
- app config changes
- platform-specific behavior

document that clearly in:

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/SUPABASE.md](/Users/sirishjoshi/Desktop/Topey/docs/SUPABASE.md) when the change touches backend or auth integration
- [docs/ANALYTICS.md](/Users/sirishjoshi/Desktop/Topey/docs/ANALYTICS.md) when the change touches analytics setup, event naming, or replay behavior
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md) when the change touches identity, tracking, or location use

## Current Quality Bar

- clean README for GitHub visitors
- developer docs for repo contributors
- architecture docs that match the real code
- backend docs that match the real schema and auth setup
- passing tests
- no stale product claims in docs
