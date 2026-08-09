-- Re-enable RLS with proper policies
-- Also disable FORCE RLS in case it was enabled (which applies RLS even to table owner)

-- First, disable FORCE RLS if it was set
alter table public.enquiries no force row level security;

-- Re-enable RLS
alter table public.enquiries enable row level security;

-- Drop any existing policies
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
