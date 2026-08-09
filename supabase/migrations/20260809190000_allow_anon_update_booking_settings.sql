-- Allow anon (client-side admin dashboard) to update booking settings
-- The admin auth is custom cookie-based, not Supabase Auth, so the dashboard
-- uses the anon key. Without this policy, price updates silently fail.

drop policy if exists "Anon can update booking settings" on public.booking_settings;

create policy "Anon can update booking settings"
  on public.booking_settings for update
  to anon
  using (true)
  with check (true);
