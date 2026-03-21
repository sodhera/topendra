# CLAUDE

## Project Context
- **Project:** Topey
- **What it is:** A mobile-first trust-layered community map for finding moderator-approved smoke-friendly places.
- **Primary user wedge:** Kathmandu students and young adults living with parents or roommates who need a reliable, lower-anxiety place to go because they cannot smoke at home.
- **Product principle:** Discovery comes first. Community, moderation, and submissions exist to make the map trustworthy.

## Current Product Shape
- Public read, authenticated write.
- Only moderator-approved places are publicly visible.
- Submission state machine: `draft -> submitted -> needs_more_proof -> approved -> rejected`
- `Place` is the canonical public object.
- Reviews and conversation attach to each place like Google reviews.
- Photos are optional in v1 and must never block submission.
- Trusted users may live-edit approved places, but those edits require auditability and clear permission gates.

## Key Docs To Read First
- [DESIGN.md](/Users/sirishjoshi/Desktop/Topey/DESIGN.md)
- [TODOS.md](/Users/sirishjoshi/Desktop/Topey/TODOS.md)
- External planning docs created before repo setup:
  - `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-design-20260321-144437.md`
  - `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-eng-review-20260321-153307.md`
  - `/Users/sirishjoshi/.gstack/projects/topey/sirishjoshi-unknown-test-plan-20260321-152354.md`

## Working Rules For Future Codex Runs
- Read `DESIGN.md` before making any visual or UI decisions.
- Preserve the trust model from the engineering review unless the user explicitly changes it.
- Keep canonical place facts above conversation in the UI.
- When new implementation decisions become real, document them in repo-local docs instead of leaving them only in conversation history.
- If the code starts diverging from the approved product or design direction, update the docs in the same change.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
