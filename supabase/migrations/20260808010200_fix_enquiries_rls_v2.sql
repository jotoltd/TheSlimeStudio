-- Fix: ensure anon can insert into enquiries
-- Previous migration created policies but anon inserts still fail
-- Try with "to public" which covers all roles

drop policy if exists "Public can insert enquiries" on public.enquiries;
drop policy if exists "Authenticated can read enquiries" on public.enquiries;
drop policy if exists "Authenticated can delete enquiries" on public.enquiries;

-- Allow anyone to submit an enquiry (contact form)
create policy "Public can insert enquiries"
  on public.enquiries for insert
  to public
  with check (true);

-- Allow authenticated (admin) to read enquiries
create policy "Authenticated can read enquiries"
  on public.enquiries for select
  to authenticated
  using (true);

-- Allow authenticated (admin) to delete enquiries
create policy "Authenticated can delete enquiries"
  on public.enquiries for delete
  to authenticated
  using (true);
