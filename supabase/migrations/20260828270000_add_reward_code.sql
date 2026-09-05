-- Add reward_code column to loyalty_cards
-- Stores a unique discount code the customer can use to claim a free session
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS reward_code text;
