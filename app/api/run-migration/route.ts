import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const MIGRATION_SQL = `
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test';

-- RLS policies for enquiries (anon can insert and select)
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert enquiries" ON public.enquiries;
CREATE POLICY "Anon can insert enquiries" ON public.enquiries FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select enquiries" ON public.enquiries;
CREATE POLICY "Anon can select enquiries" ON public.enquiries FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete enquiries" ON public.enquiries;
CREATE POLICY "Anon can delete enquiries" ON public.enquiries FOR DELETE TO anon USING (true);

-- RLS policies for bookings (anon can insert, select, delete)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert bookings" ON public.bookings;
CREATE POLICY "Anon can insert bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select bookings" ON public.bookings;
CREATE POLICY "Anon can select bookings" ON public.bookings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete bookings" ON public.bookings;
CREATE POLICY "Anon can delete bookings" ON public.bookings FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update bookings" ON public.bookings;
CREATE POLICY "Anon can update bookings" ON public.bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- RLS policies for subscribers (anon can insert, select, delete, update)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert subscribers" ON public.subscribers;
CREATE POLICY "Anon can insert subscribers" ON public.subscribers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can select subscribers" ON public.subscribers;
CREATE POLICY "Anon can select subscribers" ON public.subscribers FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete subscribers" ON public.subscribers;
CREATE POLICY "Anon can delete subscribers" ON public.subscribers FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Anon can update subscribers" ON public.subscribers;
CREATE POLICY "Anon can update subscribers" ON public.subscribers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- RLS policies for all settings tables (anon can select and update)
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

-- RLS policies for products (anon can select, insert, update, delete)
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

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not set. Run this SQL manually in your Supabase SQL Editor:",
      sql: MIGRATION_SQL.trim(),
    }, { status: 400 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql: MIGRATION_SQL }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        error: "Automatic migration failed. Run this SQL manually in Supabase SQL Editor:",
        detail: text,
        sql: MIGRATION_SQL.trim(),
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Migration completed successfully" });
  } catch (e) {
    return NextResponse.json({
      error: "Failed to run migration. Run this SQL manually in Supabase SQL Editor:",
      sql: MIGRATION_SQL.trim(),
    }, { status: 500 });
  }
}
