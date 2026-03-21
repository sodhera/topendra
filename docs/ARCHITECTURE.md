# Topey Architecture

## Product Slice

This Expo app implements the thin-slice v1 from the engineering review:

- discover approved places
- see clear rules and trust proof fast
- submit new places with optional photos
- moderate through a five-state workflow
- attach reviews to places
- support trusted-user live edits with audit logging

There is no backend yet. Everything is local-first and persisted in AsyncStorage.

## Navigation

- Root stack
  - `Home` tabs
  - `PlaceDetail`
  - `EditPlace`
- Home tabs
  - `Discover`
  - `Add`
  - `Queue`
  - `Profile`

## State Model

State is stored in a reducer-backed context:

- `currentUserId`
- `users`
- `places`
- `submissions`
- `reviews`
- `reviewVotes`
- `placeVotes`
- `auditLog`

### Canonical records

- `places` are the public, live, approved records
- `submissions` represent workflow state for new places
- `auditLog` is append-only history for live-place changes
- `reviews` and vote records attach to canonical places

## Moderation State Machine

```text
draft -> submitted -> needs_more_proof -> approved
                     \-> rejected

submitted -> approved
submitted -> rejected
approved is the only public state
```

Rules:

- `draft` is private to the submitting user
- `submitted` enters the moderator queue
- `needs_more_proof` stays private and asks for fresher or clearer evidence
- `approved` creates a canonical public `Place`
- `rejected` remains documented but never becomes public

## Authorization Matrix

```text
Guest:
  - browse approved places

Member:
  - browse
  - save drafts
  - submit places
  - write reviews
  - vote on places and reviews

Trusted scout:
  - all member actions
  - live edit approved places

Moderator:
  - all trusted actions
  - moderate submissions
  - promote/revoke trusted users
```

## Live Edit Pipeline

```text
trusted_or_moderator edits place
  -> shared place-facts validation
  -> canonical Place updated immediately
  -> append-only audit log entry written
  -> place confidence/freshness improves on next read
```

## Trust Score

Confidence is computed from:

- approval basis
- confirmation count
- reliability votes
- review vote signal
- recency of the last scout check

It is intentionally visible but not magical. The score supports moderation; it does not replace it.

## Persistence

- AsyncStorage key: `topey-demo-state-v1`
- seeded state loads first
- local state hydrates on boot
- `Reset demo data` restores the original seed

## Shared Validation

`src/lib/placeFacts.js` is the shared place-facts layer used for:

- draft saving
- submission
- live edit

This keeps field expectations consistent across write paths.

## Main Source Files

- `App.js`: app shell, fonts, navigation
- `src/context/AppContext.js`: reducer + persistence
- `src/lib/reducer.js`: state transitions
- `src/data/seed.js`: seeded Kathmandu inventory
- `src/screens/*`: user-facing flows
- `src/components/*`: reusable UI shells and form/map primitives
