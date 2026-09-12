-- Special Events system: events, instances (for recurring), and bookings

-- Event definitions (the "template" — title, description, pricing, etc.)
create table if not exists public.special_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_type text not null default 'one_off', -- 'one_off' | 'recurring'
  category text not null default 'special', -- 'adult_evening' | 'after_school' | 'workshop' | 'special'
  pricing_model text not null default 'per_person', -- 'per_person' | 'fixed_ticket'
  price numeric(10,2) not null default 15.00,
  capacity int not null default 10,
  duration_minutes int not null default 60,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Event instances (individual date/time slots — one row per occurrence)
create table if not exists public.special_event_instances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.special_events(id) on delete cascade,
  date date not null,
  start_time text not null, -- "18:00"
  capacity int not null default 10, -- overrides event capacity if set
  status text not null default 'open', -- 'open' | 'cancelled' | 'full'
  created_at timestamptz not null default now()
);

-- Event bookings (customer bookings for a specific instance)
create table if not exists public.special_event_bookings (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.special_event_instances(id) on delete cascade,
  event_id uuid not null references public.special_events(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  quantity int not null default 1,
  total_price numeric(10,2) not null default 0,
  payment_status text not null default 'pending', -- 'pending' | 'paid' | 'cancelled'
  payment_reference text,
  customer_id uuid,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_special_event_instances_event_id on public.special_event_instances(event_id);
create index if not exists idx_special_event_instances_date on public.special_event_instances(date);
create index if not exists idx_special_event_bookings_instance_id on public.special_event_bookings(instance_id);
create index if not exists idx_special_event_bookings_event_id on public.special_event_bookings(event_id);

-- RLS
alter table public.special_events enable row level security;
alter table public.special_event_instances enable row level security;
alter table public.special_event_bookings enable row level security;

-- Public can read active events
create policy "Public can read active events" on public.special_events for select to anon, authenticated using (is_active);
create policy "Public can read event instances" on public.special_event_instances for select to anon, authenticated using (true);
create policy "Public can read event bookings" on public.special_event_bookings for select to anon, authenticated using (true);

-- Public can create bookings
create policy "Public can create event bookings" on public.special_event_bookings for insert to anon, authenticated with check (true);

-- Service role has full access (via service role key, bypasses RLS)
