import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: card } = await supabaseAdmin
    .from("loyalty_cards")
    .select("id, email, name, stamps, total_stamps, rewards_earned, rewards_redeemed, reward_code, created_at, updated_at")
    .eq("email", session.email)
    .maybeSingle();

  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("loyalty_enabled, stamps_per_reward")
    .eq("id", 1)
    .single();

  return NextResponse.json({
    card: card || null,
    loyaltyEnabled: settings?.loyalty_enabled ?? false,
    stampsPerReward: settings?.stamps_per_reward ?? 10,
  });
}
