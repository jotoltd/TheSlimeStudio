create table if not exists public.subscription_settings (
  id integer primary key default 1,
  enabled boolean not null default false,
  box_name text not null default 'Slime of the Month',
  price numeric(10, 2) not null default 15.00,
  frequency text not null default 'monthly',
  current_theme text not null default '',
  current_theme_description text not null default '',
  perks text[] not null default array[]::text[],
  updated_at timestamptz not null default now(),
  constraint subscription_settings_singleton check (id = 1)
);

insert into public.subscription_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.subscription_settings enable row level security;

create policy "Public can read subscription settings"
  on public.subscription_settings for select
  to anon
  using (true);

create policy "Authenticated can read subscription settings"
  on public.subscription_settings for select
  to authenticated
  using (true);

create policy "Authenticated can update subscription settings"
  on public.subscription_settings for update
  to authenticated
  using (true)
  with check (true);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  address text,
  postcode text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "Public can insert subscribers"
  on public.subscribers for insert
  to anon
  with check (true);

create policy "Authenticated can read subscribers"
  on public.subscribers for select
  to authenticated
  using (true);

create policy "Authenticated can update subscribers"
  on public.subscribers for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete subscribers"
  on public.subscribers for delete
  to authenticated
  using (true);
