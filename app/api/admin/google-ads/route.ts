import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { googleAdsConfig, clearGoogleAdsConfigCache } from "@/lib/google-ads";

export const runtime = "nodejs";

const ALLOWED_KEYS = [
  "google_ads_client_id",
  "google_ads_client_secret",
  "google_ads_dev_token",
  "google_ads_customer_id",
  "google_ads_login_customer_id",
];

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = await googleAdsConfig();
  return NextResponse.json({
    hasClientId: !!cfg.google_ads_client_id,
    hasClientSecret: !!cfg.google_ads_client_secret,
    hasDevToken: !!cfg.google_ads_dev_token,
    customerId: cfg.google_ads_customer_id || null,
    loginCustomerId: cfg.google_ads_login_customer_id || null,
    connected: !!cfg.google_ads_refresh_token,
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const rows = Object.entries(body as Record<string, string>)
    .filter(([k]) => ALLOWED_KEYS.includes(k))
    .map(([key, value]) => ({ key, value: String(value ?? "").trim() }));
  if (rows.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { error } = await supabaseAdmin.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearGoogleAdsConfigCache();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabaseAdmin.from("site_content").delete().eq("key", "google_ads_refresh_token");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearGoogleAdsConfigCache();
  return NextResponse.json({ success: true });
}
