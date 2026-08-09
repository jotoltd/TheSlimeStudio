create policy "Authenticated can read all bookings"
  on public.bookings for select
  to authenticated
  using (true);
