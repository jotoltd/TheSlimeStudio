-- APNs device tokens for the iOS app. Registered by /api/push/register;
-- keyed on the token itself so re-registration upserts.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token text PRIMARY KEY,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Only the service role (API routes) touches this table.
CREATE POLICY "service role manages push tokens"
  ON public.push_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);
