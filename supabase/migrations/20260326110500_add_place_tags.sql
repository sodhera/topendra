alter table public.places
  add column if not exists tag text;

update public.places
set tag = 'General'
where coalesce(trim(tag), '') = '';

alter table public.places
  alter column tag set default 'General';

alter table public.places
  alter column tag set not null;

alter table public.places
  drop constraint if exists places_tag_not_blank;

alter table public.places
  add constraint places_tag_not_blank
  check (char_length(trim(tag)) > 0);
