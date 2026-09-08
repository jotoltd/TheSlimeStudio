-- Gift cards table
CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  initial_value DECIMAL(10, 2) NOT NULL,
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expiry_date TIMESTAMP WITH TIME ZONE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_reference TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for code lookups
CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_purchaser_email ON gift_cards(purchaser_email);

-- Gift card redemption history (track partial redemptions)
CREATE TABLE gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  shop_order_id TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gift_card_redemptions_gift_card_id ON gift_card_redemptions(gift_card_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique gift card code
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'GIFT-' || upper(substring(encode(gen_random_bytes(4), 'base64'), 1, 6)) || '-' || upper(substring(encode(gen_random_bytes(4), 'base64'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM gift_cards WHERE code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
