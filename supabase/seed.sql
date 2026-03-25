delete from public.place_comment_votes
where comment_id in (
  select id
  from public.place_comments
  where author_name in ('Topey team', 'Topey demo')
);

delete from public.place_comments
where author_name in ('Topey team', 'Topey demo');

delete from public.place_votes
where place_id in (
  select id
  from public.places
  where author_name in ('Topey team', 'Topey demo')
);

delete from public.places
where author_name in ('Topey team', 'Topey demo');
