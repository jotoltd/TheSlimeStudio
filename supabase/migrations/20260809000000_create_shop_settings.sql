create table if not exists public.shop_settings (
  id integer primary key default 1,
  live boolean not null default false,
  launch_date timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now(),
  constraint shop_settings_singleton check (id = 1)
);

insert into public.shop_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.shop_settings enable row level security;

create policy "Public can read shop settings"
  on public.shop_settings for select
  to anon
  using (true);

create policy "Authenticated can read shop settings"
  on public.shop_settings for select
  to authenticated
  using (true);

create policy "Authenticated can update shop settings"
  on public.shop_settings for update
  to authenticated
  using (true)
  with check (true);
