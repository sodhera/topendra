alter table public.places
add column if not exists photo_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-photos',
  'place-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read place photos" on storage.objects;
create policy "Public can read place photos"
on storage.objects for select
to public
using (bucket_id = 'place-photos');

drop policy if exists "Authenticated users can upload place photos" on storage.objects;
create policy "Authenticated users can upload place photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'place-photos' and auth.uid() is not null);

drop policy if exists "Authenticated users can update their place photos" on storage.objects;
create policy "Authenticated users can update their place photos"
on storage.objects for update
to authenticated
using (bucket_id = 'place-photos' and owner = auth.uid())
with check (bucket_id = 'place-photos' and owner = auth.uid());

drop policy if exists "Authenticated users can delete their place photos" on storage.objects;
create policy "Authenticated users can delete their place photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'place-photos' and owner = auth.uid());
