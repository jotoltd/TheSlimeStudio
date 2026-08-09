-- Fix: allow public (anon) to insert enquiries via the contact form
-- The table already exists but was missing an anon INSERT policy

alter table public.enquiries enable row level security;

-- Drop existing policies if any to avoid duplicates
drop policy if exists "Public can insert enquiries" on public.enquiries;
drop policy if exists "Authenticated can read enquiries" on public.enquiries;
drop policy if exists "Authenticated can delete enquiries" on public.enquiries;

-- Allow anyone to submit an enquiry (contact form)
create policy "Public can insert enquiries"
  on public.enquiries for insert
  to anon
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
