import { NextRequest, NextResponse } from "next/server";
import { verifyScopedToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { googleAdsConfig, clearGoogleAdsConfigCache, listAccessibleCustomers, googleAdsRedirectUri, siteOrigin } from "@/lib/google-ads";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // The signed scoped `state` issued by /connect is required — always, not
  // just when the admin cookie is missing. Relying on the cookie alone would
  // leave the endpoint open to login-CSRF: anyone who completes Google's
  // consent flow gets a `code` valid for this client_id + redirect_uri and
  // could trick an admin's browser into connecting the attacker's Ads
  // account (SameSite=Lax sends the cookie on top-level navigations).
  // The state token is minted only for authenticated admins, is scope-bound
  // ("gads-oauth") and short-lived — it can never be replayed as an
  // admin_token, even if the callback URL leaks.
  const state = req.nextUrl.searchParams.get("state");
  const statePayload = state ? verifyScopedToken("gads-oauth", state) : null;
  if (!statePayload) {
    // Missing/invalid/expired state — send the admin back to the ads page
    // with an error rather than a raw 401 (e.g. after a slow consent flow).
    return NextResponse.redirect(`${siteOrigin()}/dashboard/ads?gerr=link_expired`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  // Send the admin back to the origin they started the flow from — their
  // session cookie only exists there, so landing on the canonical host would
  // show the login screen instead of the result. `from` is inside the signed
  // state, so it can't be forged; still validate it parses to http(s).
  let home = siteOrigin();
  try {
    const u = new URL(String(statePayload?.from));
    if (u.protocol === "https:" || u.protocol === "http:") home = u.origin;
  } catch {}
  const back = (q: string) => NextResponse.redirect(`${home}/dashboard/ads?${q}`);
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
      redirect_uri: googleAdsRedirectUri(),
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
