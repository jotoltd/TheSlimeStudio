create table if not exists public.booking_settings (
  id integer primary key default 1,
  price_per_person numeric(10, 2) not null default 15.00,
  updated_at timestamptz not null default now(),
  constraint booking_settings_singleton check (id = 1)
);

insert into public.booking_settings (id, price_per_person)
values (1, 15.00)
on conflict (id) do nothing;

alter table public.booking_settings enable row level security;

create policy "Public can read booking settings"
  on public.booking_settings for select
  to anon
  using (true);

create policy "Authenticated can read booking settings"
  on public.booking_settings for select
  to authenticated
  using (true);

create policy "Authenticated can update booking settings"
  on public.booking_settings for update
  to authenticated
  using (true)
  with check (true);
