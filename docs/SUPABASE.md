# Supabase Integration

## Purpose

This document describes the live backend contract used by both Zazaspot clients.

Both `apps/mobile` and `apps/web` now depend on Supabase directly for runtime data. The shared Kathmandu fixture catalog remains test-only and is no longer merged into live reads.

## Environment

Required repo-root env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

Optional:

- `WEB_AUTH_REDIRECT_URLS`
- `WEB_SITE_URL`

For production browser auth:

- `WEB_SITE_URL` should be the canonical deployed origin, for example `https://zazaspot.com`
- `WEB_AUTH_REDIRECT_URLS` should include every deployed browser callback origin, for example `https://zazaspot.com/**,https://www.zazaspot.com/**`

## Runtime Responsibilities

Supabase is responsible for:

- storing places
- storing place votes
- storing comments and replies
- storing comment votes
- storing claimed anonymous handles
- persisting auth sessions
- handling Google auth
- storing place-open tracking events
- storing first-party browser analytics events
- storing uploaded place photos in Supabase Storage
- storing feedback submissions from the web feedback modal

## Schema

Migration files:

- [supabase/migrations/20260322114500_init_topey.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322114500_init_topey.sql)
- [supabase/migrations/20260325093000_add_handles_and_comment_votes.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260325093000_add_handles_and_comment_votes.sql)
- [supabase/migrations/20260322173000_add_place_open_events.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260322173000_add_place_open_events.sql)
- [supabase/migrations/20260323074500_add_place_comment_threads.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260323074500_add_place_comment_threads.sql)
- [supabase/migrations/20260326110500_add_place_tags.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260326110500_add_place_tags.sql)
- [supabase/migrations/20260326150000_add_place_photos.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260326150000_add_place_photos.sql)
- [supabase/migrations/20260326164500_add_analytics_events.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260326164500_add_analytics_events.sql)
- [supabase/migrations/20260326170000_add_feedback_submissions.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260326170000_add_feedback_submissions.sql)

Primary tables:

### `public.places`

Important columns:

- `id`
- `name`
- `description`
- `tag`
- `photo_urls`
- `latitude`
- `longitude`
- `created_by`
- `author_name`
- `created_at`

Important rules:

- public read
- authenticated insert for the signed-in owner
- authenticated delete for the row owner when `created_by = auth.uid()`

Tag rules:

- `tag` defaults to `General`
- `tag` is `NOT NULL`
- blank tags are rejected by a table constraint

Photo rules:

- `photo_urls` defaults to an empty array
- web uploads store files in the public `place-photos` bucket before the place row is inserted
- authenticated users can upload, update, and delete their own objects in that bucket

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

### `public.analytics_events`

Important columns:

- `event_name`
- `user_id`
- `viewer_session_id`
- `page_path`
- `place_id`
- `source_screen`
- `properties`
- `created_at`

Important rules:

- anon and authenticated clients can insert rows
- `viewer_session_id` is always required
- `user_id` must either be `null` or match `auth.uid()`
- app dashboards and ad-hoc queries should aggregate off this table instead of adding one-off tracking tables

### `public.feedback_submissions`

Important columns:

- `body`
- `user_id`
- `viewer_session_id`
- `page_path`
- `place_id`
- `source_screen`
- `created_at`

Important rules:

- anon and authenticated visitors can submit rows
- `viewer_session_id` is always required
- `user_id` must either be `null` or match `auth.uid()`
- feedback text is limited to 4000 trimmed characters

## Auth Model

Current shipped flow:

1. client opens Google sign-in through Supabase Auth
2. Google returns the authenticated identity to Supabase
3. the callback restores the Supabase session in the client
4. client claims the final unique handle in `public.user_handles`
5. client syncs the claimed handle back to auth metadata as `preferred_username`

The apps never use `full_name`, `user_name`, or similar real-world metadata as the public author label.
The apps also remove direct email display from public-facing and profile UI, but Supabase Auth still stores the email for account login.

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
- `createAnalyticsEvent`
- `createFeedbackSubmission`

### Place Creation Compatibility

The shipped clients now treat `tag` as an optional write field for compatibility.

Why:

- mobile does not yet collect a custom tag during place creation
- Supabase/PostgREST can temporarily reject the `tag` column if the schema cache is stale immediately after the migration is added

Current behavior:

1. client tries to insert the requested tag when a non-default tag is present
2. if Supabase reports that `places.tag` is missing from the schema cache, the client retries without `tag`
3. the insert succeeds and the database default applies

This keeps place creation working while the backend cache catches up, but custom tags are only persisted once the tag migration is fully visible to the API layer.

## Seed And Admin Scripts

Files:

- [supabase/seed.sql](/Users/sirishjoshi/Desktop/Topey/supabase/seed.sql)
- [scripts/apply-supabase-sql.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/apply-supabase-sql.mjs)
- [scripts/sync-supabase-auth-config.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/sync-supabase-auth-config.mjs)

Current behavior:

- `npm run supabase:migrate` applies every `.sql` file in `supabase/migrations`
- `npm run supabase:seed` removes placeholder demo/team rows and their dependent votes/comments/comment-votes

Operational note:

- if the live API still reports `Could not find the 'tag' column of 'places' in the schema cache`, re-run the migrations and refresh the Supabase API schema cache before expecting custom tags to persist

## Test User Script

[scripts/create-test-user.mjs](/Users/sirishjoshi/Desktop/Topey/scripts/create-test-user.mjs) still exists for developer QA against Supabase Auth.

It is not the shipped user flow. The product UI uses Google sign-in.
