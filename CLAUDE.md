# CLAUDE

## Project Context

- **Project:** Topey
- **Current shape:** a minimal Expo mobile app with a live in-app map, a browse flow, and an add-place flow
- **Important change:** earlier moderation-heavy planning docs are historical only; the current repo implements a much smaller product

## Product Rules

- The home screen must stay simple:
  - small `Add a place` button near the top
  - large `Find a place` button near the bottom
  - live map in the background
- Browsing happens inside the Topey app, not by kicking the user out to Apple Maps or Google Maps.
- Logged-in users can upvote, downvote, and comment.
- Guests can browse places, but adding a place remains login-gated.
- The add-place flow should land on a live map first, then open a details modal from an explicit `Add here` action.
- The app is Expo native and written in JavaScript.

## Design Direction

- Use a simple shadcn-style visual language:
  - neutral dark surfaces
  - clean borders
  - rounded cards
  - straightforward typography
  - minimal ornament
- Do not bring back the earlier fantasy or consultancy-heavy design directions unless the user explicitly asks.

## Key Docs To Read First

- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [docs/ARCHITECTURE.md](/Users/sirishjoshi/Desktop/Topey/docs/ARCHITECTURE.md)
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
