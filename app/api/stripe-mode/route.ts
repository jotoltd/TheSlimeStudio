import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getStripeModeAsync, getPublishableKeyAsync, clearStripeModeCache } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const mode = await getStripeModeAsync();
  const publishableKey = await getPublishableKeyAsync();
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

  await supabase.from("site_settings").update({ stripe_mode: mode }).eq("id", 1);
  clearStripeModeCache();

  return NextResponse.json({
    success: true,
    mode,
  });
}
