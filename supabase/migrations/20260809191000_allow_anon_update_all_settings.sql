-- Allow anon (client-side admin dashboard) to update all settings tables
-- The admin auth is custom cookie-based, not Supabase Auth, so the dashboard
-- uses the anon key. Without these policies, all admin updates silently fail.

-- subscription_settings
drop policy if exists "Anon can update subscription settings" on public.subscription_settings;
create policy "Anon can update subscription settings"
  on public.subscription_settings for update
  to anon
  using (true)
  with check (true);

-- shop_settings
drop policy if exists "Anon can update shop settings" on public.shop_settings;
create policy "Anon can update shop settings"
  on public.shop_settings for update
  to anon
  using (true)
  with check (true);

-- subscribers
drop policy if exists "Anon can update subscribers" on public.subscribers;
create policy "Anon can update subscribers"
  on public.subscribers for update
  to anon
  using (true)
  with check (true);

-- Also allow anon to delete subscribers (for admin removal)
drop policy if exists "Anon can delete subscribers" on public.subscribers;
create policy "Anon can delete subscribers"
  on public.subscribers for delete
  to anon
  using (true);

-- Also allow anon to delete bookings (for admin cancellation)
drop policy if exists "Anon can delete bookings" on public.bookings;
create policy "Anon can delete bookings"
  on public.bookings for delete
  to anon
  using (true);

-- Also allow anon to delete enquiries (for admin deletion)
drop policy if exists "Anon can delete enquiries" on public.enquiries;
create policy "Anon can delete enquiries"
  on public.enquiries for delete
  to anon
  using (true);
