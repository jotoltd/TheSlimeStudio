drop policy if exists "Authenticated can manage admins" on public.admins;

create policy "Anyone can manage admins"
  on public.admins for all
  to anon, authenticated
  using (true)
  with check (true);
