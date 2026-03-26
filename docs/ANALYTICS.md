# Analytics

## Scope

This document covers browser analytics for `apps/web`.

Current provider:

- PostHog browser SDK through [apps/web/src/lib/analytics.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/analytics.js)

Current goals:

- measure unique visitors and routed screen views
- autocapture where people click in the browser shell
- measure conversion through sign-in, anonymous-handle completion, add-place, save, comment, and voting flows
- support replay-driven debugging without storing raw text input in the replay stream

## Environment

Browser analytics is off until `VITE_POSTHOG_KEY` is present.

Supported variables:

- `VITE_POSTHOG_KEY`: required to enable analytics
- `VITE_POSTHOG_HOST`: optional ingest host, defaults to `https://us.i.posthog.com`
- `VITE_POSTHOG_UI_HOST`: optional PostHog app host used for linked browser features
- `VITE_POSTHOG_ENABLE_SESSION_REPLAY`: optional, defaults to `true`

## Runtime Mechanism

1. `App.jsx` calls `initializeAnalytics()` once on mount
2. the analytics helper reads the Vite env and no-ops if the project key is missing
3. PostHog autocaptures SPA pageview history changes and browser click activity
4. `App.jsx` calls `identifyAnalyticsUser()` when Supabase has a logged-in user
5. `App.jsx` calls `resetAnalyticsUser()` after sign-out so anonymous and authenticated activity do not share the same analytics identity
6. explicit funnel events are emitted after successful writes, not before

## Event Contract

Autocapture covers generic clicks. Custom events exist so dashboards and funnels can rely on stable names.

Current custom events:

- `screen viewed`
- `auth modal opened`
- `google sign in requested`
- `auth session started`
- `auth session ended`
- `anonymous handle claimed`
- `anonymous handle required`
- `place detail opened`
- `place location opened`
- `place add flow started`
- `place created`
- `place deleted`
- `place saved`
- `place unsaved`
- `place vote changed`
- `comment composer opened`
- `comment created`
- `comment vote changed`
- `tag filter changed`
- `tag filters cleared`

Current event-property rules:

- prefer ids, booleans, lengths, tags, and source labels
- do not send comment bodies, place descriptions, or raw coordinates as analytics properties
- do not identify PostHog people by email

## Person Properties

After login, PostHog identifies the user by Supabase `user.id`.

Current person properties:

- `anonymous_handle`
- `has_anonymous_handle`

## Replay Guardrails

Session replay is enabled by default once analytics is configured.

Current masking rule:

- all input fields are masked client-side through `session_recording.maskAllInputs`

If replay cost or privacy requirements change, update:

- [apps/web/src/lib/analytics.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/analytics.js)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
