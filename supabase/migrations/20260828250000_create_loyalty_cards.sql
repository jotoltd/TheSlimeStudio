-- Create loyalty_cards table
-- This table was referenced in code but never created via migration

CREATE TABLE IF NOT EXISTS public.loyalty_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  stamps integer NOT NULL DEFAULT 0,
  total_stamps integer NOT NULL DEFAULT 0,
  rewards_earned integer NOT NULL DEFAULT 0,
  rewards_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS loyalty_cards_email_idx ON public.loyalty_cards (lower(email));

-- RLS policies
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public loyalty_cards select" ON public.loyalty_cards;
CREATE POLICY "Public loyalty_cards select" ON public.loyalty_cards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public loyalty_cards insert" ON public.loyalty_cards;
CREATE POLICY "Public loyalty_cards insert" ON public.loyalty_cards FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public loyalty_cards update" ON public.loyalty_cards;
CREATE POLICY "Public loyalty_cards update" ON public.loyalty_cards FOR UPDATE USING (true) WITH CHECK (true);
