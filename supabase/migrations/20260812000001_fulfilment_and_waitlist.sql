-- Shop order fulfilment tracking
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'new';
UPDATE public.shop_orders SET fulfillment_status = 'new' WHERE fulfillment_status IS NULL;

-- Waitlist for sold-out booking slots
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  date text not null,
  time_slot text not null,
  people int not null default 1,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage waitlist" ON public.waitlist
  FOR ALL TO service_role USING (true) WITH CHECK (true);
