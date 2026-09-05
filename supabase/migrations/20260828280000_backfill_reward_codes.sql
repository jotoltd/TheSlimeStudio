-- Backfill reward codes for loyalty cards that have available rewards but no code
-- This generates a FREE-XXXXXX discount code (100% off, booking, single use) for each

DO $$
DECLARE
  card RECORD;
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  FOR card IN
    SELECT id, email, name, rewards_earned, rewards_redeemed
    FROM public.loyalty_cards
    WHERE reward_code IS NULL
      AND (rewards_earned - rewards_redeemed) > 0
  LOOP
    -- Generate unique code
    new_code := 'FREE-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Insert discount code
    INSERT INTO public.discount_codes (code, description, discount_type, value, scope, min_spend, max_uses, used_count, active)
    VALUES (new_code, 'Loyalty reward — free session for ' || card.name, 'percentage', 100, 'booking', 0, 1, 0, true)
    ON CONFLICT (code) DO NOTHING;

    -- Update loyalty card with reward code
    UPDATE public.loyalty_cards SET reward_code = new_code WHERE id = card.id;
  END LOOP;
END $$;
