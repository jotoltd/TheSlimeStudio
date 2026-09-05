-- Fix loyalty cards: calculate rewards_earned for cards where total_stamps >= stamps_per_reward
-- The backfill migration set stamps but didn't calculate rewards_earned properly

UPDATE public.loyalty_cards
SET
  rewards_earned = floor(total_stamps / 4),
  stamps = total_stamps % 4
WHERE total_stamps >= 4 AND rewards_earned = 0;

-- Generate reward codes for cards that now have available rewards but no code
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
    new_code := 'FREE-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    INSERT INTO public.discount_codes (code, description, discount_type, value, scope, min_spend, max_uses, used_count, active)
    VALUES (new_code, 'Loyalty reward — free session for ' || card.name, 'percentage', 100, 'booking', 0, 1, 0, true)
    ON CONFLICT (code) DO NOTHING;

    UPDATE public.loyalty_cards SET reward_code = new_code WHERE id = card.id;
  END LOOP;
END $$;
