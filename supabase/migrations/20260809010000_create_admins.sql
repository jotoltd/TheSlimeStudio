create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text not null default 'Admin',
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "Public can read admins"
  on public.admins for select
  to anon
  using (true);

create policy "Authenticated can manage admins"
  on public.admins for all
  to anon, authenticated
  using (true)
  with check (true);
