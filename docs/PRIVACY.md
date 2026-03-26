# Privacy Notes

## Product Intent

Zazaspot is anonymous-by-default in the public UI.

## Identity Data

What the app collects:

- email address through Google and Supabase Auth for authentication
- an optional suggested anonymous handle during sign-in
- a required unique anonymous handle before the user can post places or comments

What the app shows publicly:

- `author_name` on places
- `author_name` on comments

Rules:

- public identity comes from the claimed anonymous handle
- public UI must not fall back to real-world identity fields
- public profile and author surfaces must not display the stored email address
- if a handle has not been claimed yet, the UI uses `Anonymous member` locally and blocks posting until setup is complete

Current in-product disclosure:

- the sign-in sheet tells the user that Google and Supabase Auth process the email for login
- the sign-in sheet tells the user that Zazaspot never shows the email publicly and uses the anonymous handle for public activity

## Location Data

Foreground location is used for:

- centering the map near the user
- showing nearby map context
- saving the coordinates of places the user explicitly adds

If location permission is denied:

- the app falls back to the default Kathmandu region
- browsing still works

## Tracking Data

The app records explicit place opens in `place_open_events`.

The web app also sends browser analytics into `public.analytics_events` in Supabase.

Each event stores:

- `place_id`
- `user_id` when logged in, otherwise `null`
- `viewer_session_id`
- `source_screen`
- `opened_at`

Supabase analytics stores:

- anonymous visitor activity before login
- routed screen views and autocaptured click interactions
- explicit product events for auth, anonymous-handle claim, add-place, save, comment, and voting flows
- the Supabase `user.id` when the visitor is logged in
- the shared browser `viewer_session_id` for anonymous and authenticated activity stitching

Supabase analytics does not store:

- the user email as an analytics field
- raw comment bodies, place descriptions, or session replay data

## Stored Surfaces

- Supabase Auth: email, session, synced `preferred_username`
- `public.user_handles`: unique claimed anonymous handle
- `public.places`: place content, coordinates, creator id, public author name
- `public.place_comments`: comment body, reply parent, public author name
- `public.place_votes`: per-user place votes
- `public.place_comment_votes`: per-user comment votes
- `public.place_open_events`: place-open tracking
- `public.analytics_events`: browser analytics events keyed by viewer session id and optional `user_id`

## Developer Rule

If identity, location, or tracking behavior changes, update this file in the same code change.
