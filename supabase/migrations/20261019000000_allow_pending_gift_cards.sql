-- Gift cards insert as 'pending' and activate once payment is confirmed, but
-- the table's status CHECK was never updated to allow it — every purchase
-- fails the insert. Relax the constraint.
ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_status_check;
ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_status_check
  CHECK (status IN ('pending', 'active', 'used', 'expired', 'cancelled'));

-- Referenced by gift-card-purchase for ad attribution; previously only applied
-- via the run-migration route on some environments.
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS ad_source TEXT;
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
