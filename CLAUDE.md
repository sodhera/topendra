# CLAUDE

## Project Context

- **Project:** Topey
- **Current shape:** a monorepo with `apps/mobile`, `apps/web`, and `packages/shared`
- **Important change:** earlier moderation-heavy planning docs are historical only; the current repo implements a much smaller product

## Product Rules

- The home screen must stay simple:
  - live map in the background
  - `Profile` or `Sign in` at the top right
  - one large `+` add button at the bottom
  - pin taps should open the place modal directly on home
  - no center-floating action row or oversized homepage widget
- Browsing happens inside the Topey app, not by kicking the user out to Apple Maps or Google Maps.
- Logged-in users can upvote, downvote, and comment.
- Guests can browse places, but adding a place remains login-gated.
- Account creation and sign-in should use email only plus an anonymous public username.
- Place modals should expose `Open location` plus compact arrow voting instead of large stacked vote buttons.
- Place modals should keep creator attribution visible beside the place-level vote controls as `Added by: <Username>`.
- Sheet actions should have Apple-like hierarchy: one clearly dominant CTA, smaller supporting controls, and compact composer actions.
- Place sheets should preview only the top of the thread, then open a separate discussion modal for the full Reddit-like conversation flow.
- The add-place flow should land on a live map first, then open a details modal from an explicit `Add here` action.
- Home and browse maps must stay pannable; they should not lock to GPS after load.
- Home and browse maps also must not be controlled with `region={...}` in a way that fights native drag gestures.
- Browse mode should have only `Back` at the top left and `Add a place` at the top right.
- Browse previews should open from explicit dot taps, not automatic map-center tracking.
- Demo Kathmandu pins should stay visible by default so the map behavior is easy to verify.
- The runtime demo dataset should include up to 50 Kathmandu places with multiple comment threads for testing.
- Button and overlay treatment should follow an Apple-like iOS direction with a monochrome white/black/grey palette, solid white surfaces, generous radii, and clear hierarchy without overdone glass effects.
- Each place open should be tracked so later notification work has real event history.
- Location usage should stay explicit: it centers the map, supports nearby exploration, and stores added place coordinates.
- The app is Expo native and written in JavaScript.
- The browser app is React + Vite and reuses the shared demo data/utilities package.

## Design Direction

- Use an Apple-like iOS visual language:
  - grouped light backgrounds
  - solid white map chrome
  - black primary controls
  - larger rounded sheets and cards
  - clean typography with stronger title hierarchy
- Do not bring back the earlier fantasy or consultancy-heavy design directions unless the user explicitly asks.

## Key Docs To Read First

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [docs/MONOREPO.md](/Users/sirishjoshi/Desktop/Topey/docs/MONOREPO.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)

## Historical Planning Docs

These exist for background only and are no longer the source of truth for implementation:

- `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-design-20260321-144437.md`
- `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-eng-review-20260321-153307.md`
- `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-test-plan-20260321-152354.md`

## Rules For Future Codex Runs

- Keep repo docs aligned with the real code.
- If the user changes product scope again, update repo-local docs in the same change.
- Prefer the simplest working mobile UX over abstract product machinery.
- Preserve the Expo-native map experience and the login-gated vote/comment behavior unless the user changes it.
