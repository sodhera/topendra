create table if not exists public.place_open_events (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  viewer_session_id text not null check (char_length(trim(viewer_session_id)) > 0),
  source_screen text not null default 'unknown',
  opened_at timestamptz not null default timezone('utc', now())
);

create index if not exists place_open_events_place_idx
  on public.place_open_events (place_id, opened_at desc);

create index if not exists place_open_events_viewer_idx
  on public.place_open_events (viewer_session_id, opened_at desc);

alter table public.place_open_events enable row level security;

drop policy if exists "public can insert open events" on public.place_open_events;
create policy "public can insert open events"
  on public.place_open_events
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or auth.uid() = user_id
  );

drop policy if exists "authenticated can read open events" on public.place_open_events;
create policy "authenticated can read open events"
  on public.place_open_events
  for select
  to authenticated
  using (auth.uid() = user_id);

grant insert on public.place_open_events to anon, authenticated;
grant select on public.place_open_events to authenticated;
