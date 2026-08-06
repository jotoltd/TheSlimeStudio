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

create policy "Public can insert bookings"
  on public.bookings for insert
  to anon
  with check (true);

create policy "Public can read bookings for availability"
  on public.bookings for select
  to anon
  using (true);

create policy "Authenticated can delete bookings"
  on public.bookings for delete
  to authenticated
  using (true);

create index if not exists bookings_date_slot_idx on public.bookings (date, time_slot);
