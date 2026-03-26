create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) > 0 and char_length(trim(body)) <= 4000),
  user_id uuid references auth.users (id) on delete set null,
  viewer_session_id text not null check (char_length(trim(viewer_session_id)) > 0),
  page_path text not null default '/',
  place_id uuid references public.places (id) on delete set null,
  source_screen text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feedback_submissions_created_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_viewer_idx
  on public.feedback_submissions (viewer_session_id, created_at desc);

create index if not exists feedback_submissions_user_idx
  on public.feedback_submissions (user_id, created_at desc)
  where user_id is not null;

alter table public.feedback_submissions enable row level security;

drop policy if exists "public can insert feedback submissions" on public.feedback_submissions;
create policy "public can insert feedback submissions"
  on public.feedback_submissions
  for insert
  to anon, authenticated
  with check (
    char_length(trim(body)) > 0
    and char_length(trim(body)) <= 4000
    and char_length(trim(viewer_session_id)) > 0
    and (user_id is null or auth.uid() = user_id)
  );

grant insert on public.feedback_submissions to anon, authenticated;
