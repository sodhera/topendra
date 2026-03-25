create extension if not exists citext;

create table if not exists public.user_handles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle citext not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  check (char_length(trim(handle::text)) between 3 and 24)
);

create table if not exists public.place_comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.place_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists place_comment_votes_comment_user_unique
  on public.place_comment_votes (comment_id, user_id);

create index if not exists place_comment_votes_comment_idx
  on public.place_comment_votes (comment_id);

alter table public.user_handles enable row level security;
alter table public.place_comment_votes enable row level security;

drop policy if exists "public can read anonymous handles" on public.user_handles;
create policy "public can read anonymous handles"
  on public.user_handles
  for select
  using (true);

drop policy if exists "authenticated can insert own handle" on public.user_handles;
create policy "authenticated can insert own handle"
  on public.user_handles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "authenticated can update own handle" on public.user_handles;
create policy "authenticated can update own handle"
  on public.user_handles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "public can read comments" on public.place_comments;
drop policy if exists "authenticated can read comments" on public.place_comments;
create policy "public can read comments"
  on public.place_comments
  for select
  using (true);

drop policy if exists "authenticated can insert places" on public.places;
create policy "authenticated can insert places"
  on public.places
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.user_handles
      where user_handles.user_id = auth.uid()
        and user_handles.handle::text = author_name
    )
  );

drop policy if exists "authenticated can insert own comments" on public.place_comments;
create policy "authenticated can insert own comments"
  on public.place_comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.user_handles
      where user_handles.user_id = auth.uid()
        and user_handles.handle::text = author_name
    )
  );

drop policy if exists "public can read comment votes" on public.place_comment_votes;
create policy "public can read comment votes"
  on public.place_comment_votes
  for select
  using (true);

drop policy if exists "authenticated can insert own comment votes" on public.place_comment_votes;
create policy "authenticated can insert own comment votes"
  on public.place_comment_votes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "authenticated can update own comment votes" on public.place_comment_votes;
create policy "authenticated can update own comment votes"
  on public.place_comment_votes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authenticated can delete own comment votes" on public.place_comment_votes;
create policy "authenticated can delete own comment votes"
  on public.place_comment_votes
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.user_handles to anon, authenticated;
grant insert, update on public.user_handles to authenticated;
grant select on public.place_comments to anon, authenticated;
grant select on public.place_comment_votes to anon, authenticated;
grant insert, update, delete on public.place_comment_votes to authenticated;

with candidate_handles as (
  select
    users.id as user_id,
    trim(
      coalesce(
        users.raw_user_meta_data ->> 'preferred_username',
        ''
      )
    )::citext as handle,
    row_number() over (
      partition by lower(
        trim(
          coalesce(
            users.raw_user_meta_data ->> 'preferred_username',
            ''
          )
        )
      )
      order by users.created_at, users.id
    ) as handle_rank
  from auth.users as users
  where trim(coalesce(users.raw_user_meta_data ->> 'preferred_username', '')) <> ''
)
insert into public.user_handles (user_id, handle)
select candidate_handles.user_id, candidate_handles.handle
from candidate_handles
where candidate_handles.handle_rank = 1
on conflict (user_id) do nothing;

update auth.users as users
set raw_user_meta_data = coalesce(users.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('preferred_username', user_handles.handle::text)
from public.user_handles
where users.id = user_handles.user_id
  and coalesce(users.raw_user_meta_data ->> 'preferred_username', '') <> user_handles.handle::text;

with demo_places as (
  select id
  from public.places
  where author_name in ('Topey team', 'Topey demo')
),
demo_comments as (
  select id
  from public.place_comments
  where place_id in (select id from demo_places)
)
delete from public.place_comment_votes
where comment_id in (select id from demo_comments);

delete from public.place_comments
where place_id in (
  select id
  from public.places
  where author_name in ('Topey team', 'Topey demo')
);

delete from public.place_votes
where place_id in (
  select id
  from public.places
  where author_name in ('Topey team', 'Topey demo')
);

delete from public.places
where author_name in ('Topey team', 'Topey demo');
