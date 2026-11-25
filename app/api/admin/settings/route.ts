import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

// Whitelisted settings tables + editable columns. Anything else is rejected —
// this endpoint replaces the anon-key UPDATE policies that let anyone change
// prices, payment providers, or maintenance mode.
const ALLOWED: Record<string, { columns: Set<string> }> = {
  site_settings: {
    columns: new Set([
      "maintenance_mode", "loyalty_enabled", "referrals_enabled", "stamps_per_reward",
      "launch_date", "theme", "theme_end_date",
      "fb_pixel_id", "fb_pixel_enabled", "ga_measurement_id", "ga_enabled",
      "tiktok_pixel_id", "tiktok_pixel_enabled", "google_ads_id", "google_ads_enabled",
      "snapchat_pixel_id", "snapchat_pixel_enabled",
    ]),
  },
  booking_settings: {
    columns: new Set(["price_per_person", "time_slots", "slot_capacity", "max_daily_bookings"]),
  },
  subscription_settings: {
    columns: new Set([
      "enabled", "box_name", "price", "frequency", "current_theme", "current_theme_description",
      "next_theme", "next_theme_description", "theme_change_date", "perks",
    ]),
  },
  shop_settings: {
    columns: new Set(["live", "launch_date"]),
  },
};

// GET ?table=<name> — admin-only read of a whitelisted settings table.
// The dashboard pages used to read these with the anon key; once RLS locks
// the tables down those reads would return nothing.
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const table = new URL(req.url).searchParams.get("table") || "";
  if (!(table in ALLOWED)) {
    return NextResponse.json({ error: "Unknown settings table" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from(table).select("*");
  if (error) {
    console.error(`admin settings GET ${table} error:`, error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
  return NextResponse.json({ rows: data || [] });
}

// POST { table, id, patch: {...} } — applies a whitelisted update.
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { table?: string; id?: number | string; patch?: Record<string, unknown> };
  const { table, id, patch } = body;

  const spec = table ? ALLOWED[table] : undefined;
  if (!spec || id === undefined || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Invalid settings update" }, { status: 400 });
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!spec.columns.has(key)) {
      return NextResponse.json({ error: `Column not allowed: ${key}` }, { status: 400 });
    }
    clean[key] = value;
  }
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "Empty update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(table!).update(clean).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
