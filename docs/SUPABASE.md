# Supabase Integration

## Purpose

This document describes the live backend contract used by both Topey clients.

Both `apps/mobile` and `apps/web` now depend on Supabase directly for runtime data. The shared Kathmandu fixture catalog remains test-only and is no longer merged into live reads.

## Environment

Required repo-root env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

Optional:

- `WEB_AUTH_REDIRECT_URLS`
- `WEB_SITE_URL`

## Runtime Responsibilities

Supabase is responsible for:

- storing places
- storing place votes
- storing comments and replies
- storing comment votes
- storing claimed anonymous handles
- persisting auth sessions
- handling email-link auth
- storing place-open tracking events

## Schema

Migration files:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
- [supabase/migrations/20260325093000_add_handles_and_comment_votes.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260325093000_add_handles_and_comment_votes.sql)

Primary tables:

### `public.places`

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

Important rules:

- public read
- authenticated users can only mutate their own row
- one row per `(place_id, user_id)`

### `public.place_comments`

Important columns:

- `id`
- `place_id`
- `parent_comment_id`
- `user_id`
- `author_name`
- `body`
- `created_at`

Important rules:

- public read
- authenticated insert
- replies are represented by nullable `parent_comment_id`

### `public.place_comment_votes`

Important rules:

- public read
- authenticated users can only mutate their own row
- one row per `(comment_id, user_id)`

### `public.user_handles`

Important rules:

- one row per `user_id`
- `handle` is unique and case-insensitive
- used as the source of truth for public anonymous identity

### `public.place_open_events`

Important columns:

- `place_id`
- `user_id`
- `viewer_session_id`
- `source_screen`
- `opened_at`

## Auth Model

Current shipped flow:

1. client collects email
2. client may collect a suggested anonymous handle
3. client calls `supabase.auth.signInWithOtp`
4. email callback restores the session
5. client claims the final unique handle in `public.user_handles`
6. client syncs the claimed handle back to auth metadata as `preferred_username`

The apps never use `full_name`, `user_name`, or similar real-world metadata as the public author label.

## App-Side Data Flow

Read helpers:

- [apps/mobile/src/lib/backend.js](/Users/sirishjoshi/Desktop/Topey/apps/mobile/src/lib/backend.js)
- [apps/web/src/lib/backend.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/backend.js)

Each client fetches:

- `places`
- `place_votes`
- `place_comments`
- `place_comment_votes`

Write helpers expose:

- `createPlace`
- `voteForPlace`
- `createComment`
- `voteForComment`
- `claimAnonymousHandle`
- `createPlaceOpenEvent`

## Seed And Admin Scripts

Files:

- [supabase/seed.sql](/Users/sirishjoshi/Desktop/Topey/supabase/seed.sql)
- [scripts/apply-supabase-sql.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/apply-supabase-sql.mjs)
- [scripts/sync-supabase-auth-config.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/sync-supabase-auth-config.mjs)

Current behavior:

- `npm run supabase:migrate` applies every `.sql` file in `supabase/migrations`
- `npm run supabase:seed` removes placeholder `Topey demo` / `Topey team` rows and their dependent votes/comments/comment-votes

## Test User Script

[scripts/create-test-user.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/create-test-user.mjs) still exists for developer QA against Supabase Auth.

It is not the shipped user flow. The product UI is email-link only.
