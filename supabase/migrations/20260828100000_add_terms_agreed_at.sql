-- Add terms agreement tracking to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz;
