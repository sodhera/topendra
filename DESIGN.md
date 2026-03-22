# DESIGN.md

## Intent

Topey should feel simple, calm, and modern. The visual reference is Apple’s current iOS interface guidance:

- clear content hierarchy
- touch-first controls with obvious hit areas
- softly layered materials instead of flat blocks
- generous corner radii on sheets and cards
- restrained typography with strong title emphasis
- very little decorative noise

This repo is an Expo native app, so the goal is **Apple-like**, not a literal clone of Apple Maps.
Use Apple’s HIG as the directional guide and preserve the current product structure while translating the chrome, spacing, and hierarchy to feel more native.

## Reference Docs

- Apple Human Interface Guidelines: [developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- Apple UI Design Dos and Don’ts: [developer.apple.com/design/tips](https://developer.apple.com/design/tips/)

## Core UI Rules

- The home screen is the product pitch:
  - `Profile` or `Sign in` near the top right
  - one large `+` add button near the bottom
  - live map behind everything
- The browse screen should feel like a straightforward map app with a clean bottom sheet.
- The add-place screen should feel like a simple form over a map, not a multi-step wizard.

## Color

- Background: iOS grouped-light neutral
- Cards: bright translucent white
- Borders: very light separators, not hard outlines
- Primary button: system blue
- Primary button text: white
- Accent: system blue for active states, selected markers, and actionable emphasis

Use the tokens in [src/lib/theme.js](/Users/sirishjoshi/Desktop/Topey/src/lib/theme.js) as the source of truth.

## Typography

- Default system typography only
- Strong, compact headings with tight tracking
- Semibold for important labels
- Regular/system for body copy
- No decorative display fonts

## Spacing

- Base spacing unit: `8`
- Prefer generous padding on cards and sheets
- Avoid cramped map overlays

## Components

- Buttons should feel like native iOS controls:
  - filled primary actions in system blue
  - translucent secondary pills for map chrome
  - minimum 44pt tappable compact controls
  - only one dominant CTA per sheet; supporting actions should step down in size and emphasis
- Place thread previews should feel Reddit-like:
  - metadata sits in one line, not boxed KPI cards
  - place-level voting uses plain arrows under the main location action
  - the place sheet only previews the top of the thread
  - a separate discussion modal handles the full comment stack
- Cards and sheets should have:
  - large radii
  - thin separators
  - soft depth
  - slightly translucent white materials
- Inputs should be plain, bordered, and legible
- Stats should read like grouped inset cards rather than dashboard tiles

## Anti-Goals

- No fantasy styling
- No heavy textures or ornamental patterns
- No fake dashboard complexity
- No overdone fake glass or exaggerated liquid effects
- No moderation-heavy or trust-score-heavy UI unless the user asks for it again
