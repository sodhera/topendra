drop policy if exists "authenticated can delete own places" on public.places;
create policy "authenticated can delete own places"
  on public.places
  for delete
  to authenticated
  using (auth.uid() = created_by);

grant delete on public.places to authenticated;
