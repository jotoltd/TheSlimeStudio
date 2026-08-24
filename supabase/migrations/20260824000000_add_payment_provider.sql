-- Add payment_provider column to site_settings
-- Allows admin to switch between "stripe" and "sumup"
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'stripe';

-- Update existing row to default value
UPDATE site_settings SET payment_provider = 'stripe' WHERE id = 1 AND payment_provider IS NULL;
