# Design System — Topey

## Product Context
- **What this is:** A mobile-first trust-layered community map for finding moderator-approved smoke-friendly places. Discovery is the primary job; submissions, moderation, and place-scoped conversation exist to support trust.
- **Who it's for:** The first wedge is a Kathmandu student or young adult living with parents or roommates who has no private place to smoke and needs a faster, lower-anxiety way to find somewhere that is actually okay to use.
- **Space/industry:** Consumer local discovery app, community reviews, moderation-heavy city directory.
- **Project type:** Mobile-first web app.

## Aesthetic Direction
- **Direction:** Cartridge Relic Adventure
- **Decoration level:** Expressive
- **Mood:** Topey should feel like a Game Boy Advance-era fantasy field guide or quest-log menu that somehow became a real map app. It should feel tactile, nostalgic, earthy, and collectible, with forest greens, antique gold trim, bark-brown framing, parchment surfaces, and strong menu-window structure.
- **Reference sites:** None. This direction was defined collaboratively in `/design-consultation` after rejecting a restrained city-guide direction and a neon-mythic direction.

## Typography
- **Display/Hero:** `Silkscreen` — use for hero headings, section titles, count badges, map/list tabs, and short location names when the UI wants explicit cartridge-era identity.
- **Body:** `Spline Sans` — use for paragraphs, form labels, place descriptions, moderation notes, and review text. It keeps the product readable on mobile while the shell remains stylized.
- **UI/Labels:** `Spline Sans` semibold — use for buttons, chips, field labels, and compact navigation labels.
- **Data/Tables:** `IBM Plex Mono` — use for timestamps, verification notes, moderation states, trust percentages, coordinate-like values, and any tabular data. Always use tabular numerals.
- **Code:** `IBM Plex Mono`
- **Loading:** Prototype with Google Fonts during early UI work. Before production, self-host `Silkscreen`, `Spline Sans`, and `IBM Plex Mono`, use `font-display: swap`, and define a clear fallback stack in CSS.
- **Scale:**
  - `xs`: 12px / 0.75rem
  - `sm`: 14px / 0.875rem
  - `base`: 16px / 1rem
  - `lg`: 18px / 1.125rem
  - `xl`: 20px / 1.25rem
  - `2xl`: 24px / 1.5rem
  - `3xl`: 32px / 2rem
  - `4xl`: 40px / 2.5rem
  - `5xl`: 52px / 3.25rem

## Color
- **Approach:** Expressive
- **Primary:** `#355B2F` Moss Core — default filled actions, active nav states, selected chips, and trusted interaction surfaces.
- **Secondary:** `#B39245` Antique Gold — borders, highlights, trim, focus outlines, badge edges, and quest-window framing.
- **Neutrals:** Warm forest neutrals from `#F4E7C1` Save-Page Light to `#D8C28E` Parchment Tan to `#6B4A2B` Bark Brown to `#27311F` Forest Panel to `#1C2B1F` Deep Pine to `#121711` Night Root.
- **Semantic:** success `#A7C957`, warning `#D8C28E`, error `#C06A48`, info `#8CB89E`
- **Dark mode:** Dark mode is the primary identity. Light mode should feel like a cartridge manual or old save page: warm parchment surfaces, pine text, reduced surface contrast, and slightly lighter border treatment while keeping gold as the main accent.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable overall, but metadata and moderation facts can be slightly tighter than consumer-facing discovery surfaces.
- **Scale:** `2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)`

## Layout
- **Approach:** Hybrid
- **Grid:** 4 columns on mobile, 8 on tablet, 12 on desktop. Discovery surfaces should feel full-width and map-first on mobile. Detail and moderation layouts can split into panels on larger viewports.
- **Max content width:** 1200px
- **Border radius:** `sm: 6px`, `md: 12px`, `lg: 18px`, `full: 9999px`

## Motion
- **Approach:** Intentional
- **Easing:** `enter(cubic-bezier(0.18, 0.80, 0.24, 1))`, `exit(cubic-bezier(0.55, 0.08, 0.68, 0.53))`, `move(cubic-bezier(0.40, 0, 0.20, 1))`
- **Duration:** `micro(80-100ms)`, `short(160-220ms)`, `medium(240-320ms)`, `long(360-520ms)`

## Visual Mechanisms
- **Shell vs truth:** Decorative energy belongs in outer frames, section headers, map chrome, tabs, borders, and separators. Canonical place facts, moderation state, rules, and trust evidence must sit in cleaner, higher-contrast panels.
- **Window framing:** Primary surfaces should feel like RPG menu windows. Use layered borders, inset shadowing, and subtle bevel cues. Inner fact panels should be simpler than outer shells.
- **Pattern system:** Use low-contrast tiled motifs, compass or medallion accents, quest-log separators, and restrained rune/leaf geometry. Never place busy patterns behind long-form text or dense metadata.
- **Color discipline:** Gold is for trim, emphasis, or progression. Green handles action and trust. Brown and parchment support texture and historical warmth. Do not reintroduce neon accents.
- **Pixel discipline:** `Silkscreen` is a flavor font, not a paragraph font. Never use it for multi-line body copy, long buttons, moderation notes, or form helper text.

## Component Rules
- **Home / Discover:** The map is the world screen. The first view should show nearby approved places quickly, with large `Find Places` and `Add Place` actions. Place cards should show only the top facts: place name, distance, 2 to 3 rule chips, trust/confidence line, and recency.
- **Place card:** Title first, then immediate trust summary. Show chips like `Verified`, `Rolling allowed`, `Best after 6 PM`, `Pre-roll only`. Reviews or long descriptions should not dominate the card.
- **Place detail:** Put canonical facts above conversation. The first block should answer: is this approved, what is allowed, when is it best, how recently was it checked, and why should I trust it.
- **Conversation:** Reviews should feel like traveler notes attached to a place, not like a separate social feed. Keep them visually secondary and load them after the main place facts.
- **Add place:** The form should feel like filling out a quest log or location ledger. Photo upload must look optional, not required.
- **Moderator queue:** More utilitarian than consumer discovery. Keep evidence blocks dense, status clear, and approval actions unmistakable. The queue should look serious, not decorative.
- **Trusted live edit:** Live edits to approved places are high-risk. Use explicit confirmation copy, clear status labels, and visible audit context around these actions.

## Surface Recipes
- **World map surface:** Deep pine or night-root background, terrain-like overlays, thin grid or contour hints, gold frame, green pins, and one brighter leaf accent for active/selected state.
- **Location window:** Outer gold-trim shell, inner moss or parchment panel, title in `Silkscreen`, facts in `Spline Sans`, timestamps and confidence in `IBM Plex Mono`.
- **Proof block:** Quiet panel with minimal decoration, mono text, strong contrast, and no ornamental background under the data.
- **Form surface:** Quest-ledger feeling, but modern controls. Inputs should stay clean rectangles with confident outlines; decoration should live around the panel, not inside the field.

## Accessibility And Readability
- Maintain at least 4.5:1 contrast for body text and critical UI. Decorative contrast is not enough.
- Never rely on color alone to communicate moderation state, approval, or warnings. Pair color with labels or icons.
- Keep pixel-style display text large and sparse. For anything dense, use `Spline Sans` or `IBM Plex Mono`.
- Avoid patterned backgrounds behind text inputs, dense review content, proof blocks, and moderation evidence.
- Ensure action buttons remain obvious in both dark and parchment modes.

## Implementation Notes
- Dark mode should be the baseline while building the shell. Light mode is a secondary cartridge-manual variant, not the main identity.
- Start with CSS custom properties for all palette and spacing tokens. This design will be hard to maintain if colors or border styles are hardcoded ad hoc.
- Define reusable window-shell and inner-panel classes early. The nostalgic look depends on consistency more than on one-off ornament.
- If the UI gets busy, remove decoration before removing trust clarity. The product wins on confidence, not on maximal styling.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | Established a repo-local design source of truth after product and engineering planning were completed outside the repo. |
| 2026-03-21 | Shifted away from restrained field-guide direction | User wanted something brighter, deeper, more fictional, and less polite than a generic trust product. |
| 2026-03-21 | Landed on a GBA-era cartridge fantasy shell | Direct user feedback asked for green, gold, and brown aesthetics with Game Boy Advance game-design energy. |
| 2026-03-21 | Kept canonical place facts visually cleaner than the shell | The app still has to communicate moderator approval, rules, and trust quickly under the decorative layer. |
