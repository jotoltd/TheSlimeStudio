-- Blocked dates table - admin can block specific dates from being booked
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Public can read blocked dates
CREATE POLICY "Public can read blocked_dates" ON public.blocked_dates
  FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage blocked_dates" ON public.blocked_dates
  FOR ALL USING (true) WITH CHECK (true);
