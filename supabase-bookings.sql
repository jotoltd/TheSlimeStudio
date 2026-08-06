-- Run this once in the Supabase SQL Editor to create the bookings table.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time_slot text not null,
  people integer not null check (people >= 1 and people <= 10),
  total_price numeric(10, 2) not null,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

-- Anyone can create a booking (public booking form)
create policy "Public can insert bookings"
  on public.bookings for insert
  to anon
  with check (true);

-- Anyone can read time_slot/people/date (needed to compute availability)
create policy "Public can read bookings for availability"
  on public.bookings for select
  to anon
  using (true);

-- Authenticated admins can delete (cancel) bookings
create policy "Authenticated can delete bookings"
  on public.bookings for delete
  to authenticated
  using (true);

create index if not exists bookings_date_slot_idx on public.bookings (date, time_slot);
