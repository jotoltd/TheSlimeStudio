create table if not exists public.site_settings (
  id integer primary key default 1,
  maintenance_mode boolean not null default false,
  launch_date timestamptz not null default (now() + interval '7 days'),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
  on public.site_settings for select
  to anon
  using (true);

create policy "Anyone can update site settings"
  on public.site_settings for all
  to anon, authenticated
  using (true)
  with check (true);
