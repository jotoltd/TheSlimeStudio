const { createClient } = require('@supabase/supabase-js');

const url = 'https://msfbyneidkfhmofnoupg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZmJ5bmVpZGtmaG1vZm5vdXBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODAyNCwiZXhwIjoyMTAxNDY0MDI0fQ.PDtEhut-NwiPA130WFiOAnutdypnbtYYUArTkHcOJ4c';

const supabase = createClient(url, serviceKey);

async function run() {
  // Add missing columns to bookings by inserting with new fields
  // Since we can't run raw SQL via REST, we'll use the Supabase Management API
  
  // First, let's create an exec_sql function using a different approach
  // We'll use the Supabase SQL endpoint via the database connection
  
  const sql = `
-- Add missing columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_party BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Add missing columns to subscribers
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Add stripe_mode to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test';

-- Add phone column to enquiries
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS phone TEXT;

-- Enable RLS and add policies for all tables
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert enquiries" ON public.enquiries;
CREATE POLICY "Anon can insert enquiries" ON public.enquiries FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select enquiries" ON public.enquiries;
CREATE POLICY "Anon can select enquiries" ON public.enquiries FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete enquiries" ON public.enquiries;
CREATE POLICY "Anon can delete enquiries" ON public.enquiries FOR DELETE TO anon USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert bookings" ON public.bookings;
CREATE POLICY "Anon can insert bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select bookings" ON public.bookings;
CREATE POLICY "Anon can select bookings" ON public.bookings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete bookings" ON public.bookings;
CREATE POLICY "Anon can delete bookings" ON public.bookings FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update bookings" ON public.bookings;
CREATE POLICY "Anon can update bookings" ON public.bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert subscribers" ON public.subscribers;
CREATE POLICY "Anon can insert subscribers" ON public.subscribers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select subscribers" ON public.subscribers;
CREATE POLICY "Anon can select subscribers" ON public.subscribers FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete subscribers" ON public.subscribers;
CREATE POLICY "Anon can delete subscribers" ON public.subscribers FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update subscribers" ON public.subscribers;
CREATE POLICY "Anon can update subscribers" ON public.subscribers FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can select site_settings" ON public.site_settings;
CREATE POLICY "Anon can select site_settings" ON public.site_settings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update site_settings" ON public.site_settings;
CREATE POLICY "Anon can update site_settings" ON public.site_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can select booking_settings" ON public.booking_settings;
CREATE POLICY "Anon can select booking_settings" ON public.booking_settings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update booking_settings" ON public.booking_settings;
CREATE POLICY "Anon can update booking_settings" ON public.booking_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can select subscription_settings" ON public.subscription_settings;
CREATE POLICY "Anon can select subscription_settings" ON public.subscription_settings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update subscription_settings" ON public.subscription_settings;
CREATE POLICY "Anon can update subscription_settings" ON public.subscription_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can select shop_settings" ON public.shop_settings;
CREATE POLICY "Anon can select shop_settings" ON public.shop_settings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update shop_settings" ON public.shop_settings;
CREATE POLICY "Anon can update shop_settings" ON public.shop_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can select products" ON public.products;
CREATE POLICY "Anon can select products" ON public.products FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can insert products" ON public.products;
CREATE POLICY "Anon can insert products" ON public.products FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can update products" ON public.products;
CREATE POLICY "Anon can update products" ON public.products FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can delete products" ON public.products;
CREATE POLICY "Anon can delete products" ON public.products FOR DELETE TO anon USING (true);
  `;

  // Try using the Supabase SQL endpoint
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (res.ok) {
    console.log('Migration SUCCESS via exec_sql RPC');
    return;
  }

  const text = await res.text();
  console.log('exec_sql RPC not available:', text);

  // Alternative: use the Supabase Management API
  // We need the project ref and a personal access token for that
  // Since we don't have those, we'll output the SQL for manual execution
  console.log('\nPlease run this SQL in your Supabase SQL Editor:\n');
  console.log(sql);
}

run().catch(console.error);
