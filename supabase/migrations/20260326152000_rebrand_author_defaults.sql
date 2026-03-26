alter table public.places
alter column author_name set default 'Zazaspot member';

alter table public.place_comments
alter column author_name set default 'Zazaspot member';

update public.places
set author_name = 'Zazaspot member'
where author_name = 'Topey member';

update public.place_comments
set author_name = 'Zazaspot member'
where author_name = 'Topey member';
