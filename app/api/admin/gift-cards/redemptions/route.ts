import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET - Get redemptions for a specific gift card
export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("card_id");

  if (!cardId) {
    return NextResponse.json({ error: "card_id is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("gift_card_redemptions")
    .select("*")
    .eq("gift_card_id", cardId)
    .order("redeemed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ redemptions: data || [] });
}
