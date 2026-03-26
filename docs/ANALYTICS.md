# Analytics

## Scope

This document covers browser analytics for `apps/web`.

Current layers:

- Vercel Web Analytics in [apps/web/src/main.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/main.jsx) for deployed traffic and pageviews
- first-party Supabase table `public.analytics_events` written through [apps/web/src/lib/analytics.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/analytics.js)

Current goals:

- measure unique visitors and routed screen views
- let Vercel populate its built-in traffic dashboard after deploy
- track where people click in the browser shell
- measure conversion through sign-in, anonymous-handle completion, add-place, save, comment, and voting flows
- keep analytics first-party in the existing backend

## Storage

Analytics depends on the Supabase schema migration in [supabase/migrations/20260326164500_add_analytics_events.sql](/Users/sirishjoshi/Desktop/Topey/supabase/migrations/20260326164500_add_analytics_events.sql).

## Runtime Mechanism

1. `App.jsx` calls `initializeAnalytics()` once on mount
2. [apps/web/src/main.jsx](/Users/sirishjoshi/Desktop/Topey/apps/web/src/main.jsx) mounts `<Analytics />` from `@vercel/analytics/react`
3. the Supabase analytics helper stores browser context in memory: `viewer_session_id`, `page_path`, `screen_name`, and optional `user_id`
4. `App.jsx` emits a `screen viewed` row on SPA route changes
5. a delegated document click listener records button, link, and role-button clicks as `ui element clicked`
6. `App.jsx` calls `identifyAnalyticsUser()` when Supabase has a logged-in user and `resetAnalyticsUser()` on sign-out
7. explicit funnel events are emitted after successful writes, not before

## Event Contract

Generic click capture covers button, link, and role-button interactions. Custom events exist so dashboards and funnels can rely on stable names.

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
- `feedback modal opened`
- `feedback submitted`
- `tag filter changed`
- `tag filters cleared`
- `ui element clicked`

Current event-property rules:

- prefer ids, booleans, lengths, tags, and source labels
- do not send comment bodies, place descriptions, or raw coordinates as analytics properties
- do not send feedback bodies as analytics properties
- do not store user email in analytics rows

## Table Shape

Primary columns in `public.analytics_events`:

- `event_name`
- `user_id`
- `viewer_session_id`
- `page_path`
- `place_id`
- `source_screen`
- `properties`
- `created_at`

## Query Starters

Unique visitors:

```sql
select count(distinct viewer_session_id)
from public.analytics_events
where event_name = 'screen viewed'
  and created_at >= timezone('utc', now()) - interval '7 days';
```

Top clicked UI targets:

```sql
select
  properties ->> 'element_label' as element_label,
  count(*) as clicks
from public.analytics_events
where event_name = 'ui element clicked'
group by 1
order by clicks desc
limit 20;
```

Add-place funnel:

```sql
select event_name, count(distinct viewer_session_id)
from public.analytics_events
where event_name in ('place add flow started', 'place created')
group by event_name
order by event_name;
```

If the event contract changes, update:

- [apps/web/src/lib/analytics.js](/Users/sirishjoshi/Desktop/Topey/apps/web/src/lib/analytics.js)
- [docs/PRIVACY.md](/Users/sirishjoshi/Desktop/Topey/docs/PRIVACY.md)
- [README.md](/Users/sirishjoshi/Desktop/Topey/README.md)
