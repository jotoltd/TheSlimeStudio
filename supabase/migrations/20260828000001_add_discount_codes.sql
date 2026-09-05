-- Discount codes & referral system
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  -- 'percentage' or 'fixed'
  discount_type text NOT NULL DEFAULT 'percentage',
  -- For percentage: 10 = 10% off. For fixed: 5.00 = £5 off
  value numeric(10,2) NOT NULL DEFAULT 0,
  -- 'booking', 'shop', or 'both'
  scope text NOT NULL DEFAULT 'both',
  -- Minimum spend in £ (0 = no minimum)
  min_spend numeric(10,2) NOT NULL DEFAULT 0,
  -- null = unlimited
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  -- null = never expires
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  -- If this code belongs to a customer (referral), link to them
  referrer_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  -- Reward the referrer gets when their code is used (e.g. extra loyalty stamp)
  referrer_reward text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discount_codes_code_idx ON discount_codes (code);
CREATE INDEX IF NOT EXISTS discount_codes_referrer_idx ON discount_codes (referrer_customer_id);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Add discount fields to bookings and shop_orders so we can track usage
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_code text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;

ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS discount_code text;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
