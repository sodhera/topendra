alter table public.place_comments
add column if not exists parent_comment_id uuid references public.place_comments (id) on delete cascade;

create index if not exists place_comments_place_parent_idx
  on public.place_comments (place_id, parent_comment_id, created_at desc);
