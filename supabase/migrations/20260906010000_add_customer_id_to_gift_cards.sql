-- Add customer_id column to gift_cards for optional account linking
ALTER TABLE gift_cards ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for customer lookups
CREATE INDEX idx_gift_cards_customer_id ON gift_cards(customer_id);
