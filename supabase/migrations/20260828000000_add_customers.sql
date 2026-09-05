-- Customer accounts for loyalty + managing bookings
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emails are always stored lowercase; enforce fast case-consistent lookups
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_idx ON customers (lower(email));

-- Only the service role may touch this table (all access goes via API routes)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
