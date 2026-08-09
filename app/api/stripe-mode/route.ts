import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getStripeMode, getPublishableKey } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const mode = getStripeMode();
  const publishableKey = getPublishableKey();
  return NextResponse.json({ mode, publishableKey, configured: !!publishableKey });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode } = await req.json() as { mode: "live" | "test" };
  if (mode !== "live" && mode !== "test") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // The mode is controlled by the STRIPE_MODE env variable.
  // We also store it in site_settings for display purposes.
  await supabase.from("site_settings").update({ stripe_mode: mode }).eq("id", 1);

  return NextResponse.json({
    success: true,
    note: `Stripe mode is controlled by the STRIPE_MODE environment variable. Set STRIPE_MODE=${mode} in .env.local and restart the server to switch modes.`,
  });
}
