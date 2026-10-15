import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createScopedToken } from "@/lib/auth";
import { googleAdsConfig, googleAdsRedirectUri } from "@/lib/google-ads";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await googleAdsConfig();
  if (!cfg.google_ads_client_id) {
    return NextResponse.redirect(new URL("/dashboard/ads?gerr=no_client", req.url));
  }

  const params = new URLSearchParams({
    client_id: cfg.google_ads_client_id,
    redirect_uri: googleAdsRedirectUri(),
    response_type: "code",
    // adwords = campaign/reporting API; datamanager = server-side offline
    // conversion uploads (UploadClickConversions is no longer allowed for new
    // integrations). Reconnect Google Ads once after this deploys so the
    // stored refresh token picks up the new scope.
    scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/datamanager",
    access_type: "offline",
    prompt: "consent", // ensures a refresh token is returned every time
    // Signed scoped state — CSRF protection, and lets the callback authenticate
    // even when the admin's session cookie isn't sent on the callback host (e.g.
    // logged in on www while the registered redirect lands on the apex domain).
    // `from` records the origin the admin started on so the callback can send
    // them back there (where their session cookie actually exists).
    state: createScopedToken("gads-oauth", {
      from: req.nextUrl.origin,
      exp: Date.now() + 10 * 60 * 1000,
    }),
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
