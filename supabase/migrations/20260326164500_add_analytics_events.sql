create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(trim(event_name)) > 0),
  user_id uuid references auth.users (id) on delete set null,
  viewer_session_id text not null check (char_length(trim(viewer_session_id)) > 0),
  page_path text not null default '/',
  place_id uuid references public.places (id) on delete set null,
  source_screen text not null default 'unknown',
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_event_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_viewer_idx
  on public.analytics_events (viewer_session_id, created_at desc);

create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_place_idx
  on public.analytics_events (place_id, created_at desc)
  where place_id is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "public can insert analytics events" on public.analytics_events;
create policy "public can insert analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    char_length(trim(viewer_session_id)) > 0
    and (user_id is null or auth.uid() = user_id)
  );

grant insert on public.analytics_events to anon, authenticated;
