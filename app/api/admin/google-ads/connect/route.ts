import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { googleAdsConfig } from "@/lib/google-ads";

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
    redirect_uri: `${req.nextUrl.origin}/api/admin/google-ads/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline",
    prompt: "consent", // ensures a refresh token is returned every time
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
