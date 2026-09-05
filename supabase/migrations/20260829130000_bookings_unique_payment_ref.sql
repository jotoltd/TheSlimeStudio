-- Guarantee one booking per Stripe/SumUp payment reference.
-- This makes booking creation race-safe so the webhook fallback and the
-- client-side confirm call can both attempt an insert without creating duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_id_key
  ON public.bookings (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
