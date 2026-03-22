# Privacy Notes

## Product Intent

Topey is designed to be anonymous-by-default in the public UI while still using enough data to make the map work.

## Identity Data

What the app asks from the user:

- email address for authentication
- anonymous username for public activity

What the app shows publicly:

- `author_name` on places
- `author_name` on comments

Rules:

- the public name should come from the chosen anonymous username
- the UI should not fall back to email-derived names
- when no anonymous username is available, the fallback label is `Anonymous member`

## Location Data

Foreground location is used for:

- centering the add-place map near the user
- showing nearby map context when location is available
- saving the coordinates of places the user explicitly adds

If location permission is denied:

- the app falls back to Kathmandu
- browsing still works
- the user can still explore demo pins

## Tracking Data

The app records each explicit place open in `place_open_events`.

Each event stores:

- `place_id`
- `user_id` when logged in, otherwise `null`
- `viewer_session_id`
- `source_screen`
- `opened_at`

This exists to support later notification and area-update features.

## Current Storage Surface

- Supabase Auth: email, session, anonymous username in auth metadata
- `public.places`: place content, coordinates, creator id, creator display name
- `public.place_comments`: comment body plus anonymous display name
- `public.place_votes`: per-user place votes
- `public.place_open_events`: place-open analytics and future notification groundwork

## Developer Rule

If identity, location, or tracking behavior changes, update this file in the same change as the code.
