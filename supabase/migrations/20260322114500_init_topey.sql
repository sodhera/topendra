create extension if not exists pgcrypto;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  latitude double precision not null,
  longitude double precision not null,
  created_by uuid references auth.users (id) on delete set null,
  author_name text not null default 'Topey member',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.place_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists place_votes_place_user_unique
  on public.place_votes (place_id, user_id)
  where user_id is not null;

create table if not exists public.place_comments (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  author_name text not null default 'Topey member',
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists places_created_at_idx on public.places (created_at desc);
create index if not exists place_votes_place_idx on public.place_votes (place_id);
create index if not exists place_comments_place_idx on public.place_comments (place_id, created_at desc);

alter table public.places enable row level security;
alter table public.place_votes enable row level security;
alter table public.place_comments enable row level security;

drop policy if exists "public can read places" on public.places;
create policy "public can read places"
  on public.places
  for select
  using (true);

drop policy if exists "authenticated can insert places" on public.places;
create policy "authenticated can insert places"
  on public.places
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "public can read votes" on public.place_votes;
create policy "public can read votes"
  on public.place_votes
  for select
  using (true);

drop policy if exists "authenticated can insert own votes" on public.place_votes;
create policy "authenticated can insert own votes"
  on public.place_votes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "authenticated can update own votes" on public.place_votes;
create policy "authenticated can update own votes"
  on public.place_votes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authenticated can delete own votes" on public.place_votes;
create policy "authenticated can delete own votes"
  on public.place_votes
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "authenticated can read comments" on public.place_comments;
create policy "authenticated can read comments"
  on public.place_comments
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can insert own comments" on public.place_comments;
create policy "authenticated can insert own comments"
  on public.place_comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.places to anon, authenticated;
grant insert on public.places to authenticated;
grant select on public.place_votes to anon, authenticated;
grant insert, update, delete on public.place_votes to authenticated;
grant select on public.place_comments to authenticated;
grant insert on public.place_comments to authenticated;
