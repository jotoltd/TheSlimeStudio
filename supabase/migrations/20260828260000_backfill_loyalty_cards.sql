-- Backfill loyalty_cards for all existing paid bookings
-- The loyalty_cards table didn't exist when these bookings were made,
-- so no stamps were awarded. This creates cards with 1 stamp per booking.

INSERT INTO public.loyalty_cards (email, name, stamps, total_stamps, rewards_earned, rewards_redeemed)
SELECT
  lower(b.email),
  max(b.name),
  count(*) AS stamps,
  count(*) AS total_stamps,
  0 AS rewards_earned,
  0 AS rewards_redeemed
FROM public.bookings b
WHERE b.payment_status = 'paid'
GROUP BY lower(b.email)
ON CONFLICT (email) DO NOTHING;
