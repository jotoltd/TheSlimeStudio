import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { googleAdsConfig, clearGoogleAdsConfigCache, listAccessibleCustomers } from "@/lib/google-ads";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/ads?${q}`, req.url));
  if (oauthError) return back(`gerr=${encodeURIComponent(oauthError)}`);
  if (!code) return back("gerr=no_code");

  const cfg = await googleAdsConfig();
  if (!cfg.google_ads_client_id || !cfg.google_ads_client_secret) return back("gerr=no_client");

  // Exchange the code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.google_ads_client_id,
      client_secret: cfg.google_ads_client_secret,
      redirect_uri: `${req.nextUrl.origin}/api/admin/google-ads/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) return back(`gerr=${encodeURIComponent(tokens.error_description || tokens.error || "token exchange failed")}`);

  const rows = [{ key: "google_ads_refresh_token", value: tokens.refresh_token }];

  // Auto-detect the customer ID if we can list accessible accounts
  if (cfg.google_ads_dev_token && !cfg.google_ads_customer_id) {
    try {
      const ids = await listAccessibleCustomers(tokens.access_token, cfg.google_ads_dev_token);
      if (ids.length > 0) rows.push({ key: "google_ads_customer_id", value: ids[0] });
    } catch {}
  }

  await supabaseAdmin.from("site_content").upsert(rows, { onConflict: "key" });
  clearGoogleAdsConfigCache();
  return back("g=connected");
}
