# Supabase Integration

## Purpose

This document explains the backend contract that the Topey mobile app depends on.

## Environment Variables

Local development expects:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

These values should live in `.env`, not in committed files.

## Runtime Responsibilities

Supabase is responsible for:

- storing places
- storing votes
- storing comments
- storing place-open tracking events
- persisting auth sessions
- brokering email-link auth
- storing anonymous usernames in auth metadata

The app uses the publishable key at runtime. The management access token is only for local admin scripts.

## Database Contract

### `public.places`

Stores map pins and the widget copy shown in the browse experience.

Important columns:

- `id`
- `name`
- `description`
- `latitude`
- `longitude`
- `created_by`
- `author_name`
- `created_at`

### `public.place_votes`

Stores per-user upvotes and downvotes.

Important rules:

- public read is allowed so guests can still see vote ratios
- authenticated users can only insert, update, or delete their own vote row
- a partial unique index prevents duplicate votes from the same user for the same place

### `public.place_comments`

Stores discussion threads for a place.

Important rules:

- select is authenticated-only
- insert is authenticated-only
- guests do not receive comment rows from the backend

### `public.place_open_events`

Stores every explicit place open from the map UI.

Important rules:

- both guests and logged-in users can insert open events
- anonymous continuity comes from a client-side `viewer_session_id`
- authenticated reads are limited to the current user’s own rows

## Row Level Security

RLS lives in [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql).

Policy summary:

- anyone can read `places`
- anyone can read `place_votes`
- only authenticated users can insert `places`
- only authenticated users can insert/update/delete their own `place_votes`
- only authenticated users can read and insert `place_comments`
- anyone can insert `place_open_events`, but authenticated reads are scoped to their own rows

## Seed Data

Seed data lives in [supabase/seed.sql](/Users/sirishjoshi/Desktop/Topey/supabase/seed.sql).

The seed inserts:

- 50 Kathmandu demo places
- multiple anonymous vote rows per place
- 3 to 4 comment threads per place

The seed first clears old `Topey team` and `Topey demo` rows, then rebuilds the full demo browse dataset.

## App-Side Data Flow

The app context lives in [src/context/AppContext.js](/Users/sirishjoshi/Desktop/Topey/src/context/AppContext.js).

Flow:

1. Restore the saved Supabase session.
2. Restore a session from `topey://auth/callback` when the app is opened from an email link.
3. Restore or create a local anonymous viewer session id.
4. Fetch places and votes for every user.
5. Fetch comments only when a session exists.
6. Expose auth, write actions, and place-open tracking to the screens.

Backend helper code lives in:

- [src/lib/supabase.js](/Users/sirishjoshi/Desktop/Topey/src/lib/supabase.js)
- [src/lib/backend.js](/Users/sirishjoshi/Desktop/Topey/src/lib/backend.js)

## Mobile Email Auth

The mobile redirect target is:

```text
topey://auth/callback
```

The auth config sync script lives in [scripts/sync-supabase-auth-config.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/sync-supabase-auth-config.mjs).

Run:

```bash
npm run supabase:auth
```

This updates:

- `site_url`
- `uri_allow_list`
- `mailer_autoconfirm`

Runtime auth behavior:

- the app calls `supabase.auth.signInWithOtp`
- new users send `preferred_username` in auth metadata
- tapping the email link routes back into the app and the session is restored from the callback URL

## Admin Scripts

### Apply SQL over the Management API

File: [scripts/apply-supabase-sql.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/apply-supabase-sql.mjs)

Examples:

```bash
npm run supabase:migrate
npm run supabase:seed
npm run supabase:test-user
```

This path was chosen because the current repo does not have the remote Postgres password available, but it does have a Supabase management token.

### Create the seeded test user

File: [scripts/create-test-user.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/create-test-user.mjs)

Credentials:

```text
Email: testuser@topey.app
Password: TopeyTest123!
```

This script signs the user up if needed, then verifies a legacy password-based backend login path for developer QA.

This script is now developer-only backend QA. The shipped product flow uses email-link auth, not password entry in the app UI.
