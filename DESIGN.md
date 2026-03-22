# DESIGN.md

## Intent

Topey should feel simple, calm, and modern. The design reference is the general philosophy people associate with shadcn:

- clean hierarchy
- neutral palette
- obvious borders
- rounded cards
- restrained typography
- very little decorative noise

This repo is an Expo native app, so this is **shadcn-inspired**, not literal web `shadcn/ui`.

## Core UI Rules

- The home screen is the product pitch:
  - small `Add a place` button near the top
  - large `Find a place` button near the bottom
  - live map behind everything
- The browse screen should feel like a straightforward map app with a clean bottom sheet.
- The add-place screen should feel like a simple form over a map, not a multi-step wizard.

## Color

- Background: near-black
- Cards: dark neutral
- Borders: subtle light neutral
- Primary button: off-white
- Primary button text: near-black
- Accent: green, used sparingly for active markers and positive location signal

Use the tokens in [src/lib/theme.js](/Users/sirishjoshi/Desktop/Topey/src/lib/theme.js) as the source of truth.

## Typography

- Default system typography only
- Semibold for headings and important labels
- Regular/system for body copy
- No decorative display fonts

## Spacing

- Base spacing unit: `8`
- Prefer generous padding on cards and sheets
- Avoid cramped map overlays

## Components

- Buttons should look like simple shadcn buttons:
  - solid primary
  - outlined secondary
- Cards and sheets should have:
  - border
  - rounded corners
  - soft shadow
  - no gradients
- Inputs should be plain, bordered, and legible

## Anti-Goals

- No fantasy styling
- No heavy textures or ornamental patterns
- No fake dashboard complexity
- No moderation-heavy or trust-score-heavy UI unless the user asks for it again
