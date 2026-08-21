-- Shop orders table
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_method TEXT NOT NULL DEFAULT 'collection',
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_postcode TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

-- Public can create orders (checkout flow)
CREATE POLICY "Public can insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);
-- Public can read by stripe_session_id (for confirmation)
CREATE POLICY "Public can read shop_orders" ON shop_orders FOR SELECT USING (true);
