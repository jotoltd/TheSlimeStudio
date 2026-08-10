import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const MIGRATION_SQL = `
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test';
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
