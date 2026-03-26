# DESIGN.md

## Intent

Zazaspot now uses a **neo-brutalist green-and-white** system across mobile and web.

The product should feel:

- loud and clear instead of soft and glassy
- tactile instead of delicate
- map-first, but with UI chrome that looks intentionally designed
- high-contrast and readable in motion

This is not an iOS-native aesthetic anymore. The UI should use hard outlines, chunky controls, offset shadows, uppercase micro-labels where useful, and a bright green/white palette anchored by black borders.

## Core Visual System

Source of truth:

- shared runtime tokens live in [packages/shared/lib/theme.js](/Users/sirishjoshi/Desktop/Topey/packages/shared/lib/theme.js)
- web-specific layout and component rules live in [apps/web/src/styles.css](/Users/sirishjoshi/Desktop/Topey/apps/web/src/styles.css)

### Palette

- Background: `#E8FFC2`
- Card: `#FFFFFF`
- Elevated card: `#F6FFDF`
- Primary green: `#149647`
- Accent lime: `#A7FF65`
- Border/text: `#111111`
- Muted text: dark green, not grey

Rules:

- use white for surfaces
- use black for all structural outlines
- use green for primary actions and emphasis
- use accent lime for selected and celebratory moments
- avoid blue, purple, glassmorphism, and low-contrast greys

### Shape

- moderate corner radius only
- no soft pills by default unless the component truly needs it
- 2px to 3px borders on interactive and card surfaces
- offset shadows instead of blur-heavy shadows

### Type

- bold display type for titles
- uppercase labels for controls, tags, and small metadata when helpful
- body copy stays readable and direct
- avoid overly neutral “default app” typography choices

### Motion And Feedback

- interactions should feel immediate
- pressed states should visibly shift
- success states should be obvious and short-lived
- add-place completion must clearly confirm success

## Product Rules

### Home

- live map remains the main canvas
- loading copy lives on the splash screen, not the live map HUD
- floating actions should read like physical controls dropped on the map
- the add button is a major affordance and should stay visually dominant
- tag filters stay minimal in the top-right chrome
- the dark-mode toggle should stay low-friction and icon-based

### Browse

- preview cards should feel like pinned paper cards over the map
- selected state should be obvious without relying on subtle color shifts

### Add Place

- the pin-on-map interaction stays simple
- tags should default to curated presets with a clear custom path
- web add-place can attach photos directly to the place record
- after a successful add:
  - confirm to the user that the place was added
  - return them to the main screen
- if tag persistence falls back because the backend schema cache is stale, copy may mention the fallback without blocking success

### Discussion

- comments should feel structured and punchy, not floaty
- vote controls should look like real controls, not plain text glyphs

## Engineering Notes

- mobile and web should share palette intent even if component implementations differ
- do not introduce one-off colors without updating shared tokens first
- when resizing controls, preserve tap targets and keyboard accessibility
- visual changes should ship with documentation updates when the design direction changes materially

## Anti-Goals

- no soft Apple-style translucency
- no thin grey borders on light grey cards
- no blue primary actions
- no generic dashboard look
- no decorative clutter that competes with the map
