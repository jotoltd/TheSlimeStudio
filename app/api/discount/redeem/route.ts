import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { code } = await req.json() as { code?: string };

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();

  const { data: discount, error } = await supabaseAdmin
    .from("discount_codes")
    .select("id, used_count, referrer_customer_id, referrer_reward")
    .eq("code", cleanCode)
    .maybeSingle();

  if (error || !discount) {
    return NextResponse.json({ error: "Code not found." }, { status: 404 });
  }

  // Increment used count
  await supabaseAdmin
    .from("discount_codes")
    .update({ used_count: discount.used_count + 1, updated_at: new Date().toISOString() })
    .eq("id", discount.id);

  // If this is a referral code, reward the referrer
  if (discount.referrer_customer_id && discount.referrer_reward) {
    // Get referrer's email for loyalty card lookup
    const { data: referrer } = await supabaseAdmin
      .from("customers")
      .select("email, name")
      .eq("id", discount.referrer_customer_id)
      .maybeSingle();

    if (referrer) {
      // Award a loyalty stamp as the referral reward
      const { data: card } = await supabaseAdmin
        .from("loyalty_cards")
        .select("id, stamps, total_stamps")
        .eq("email", referrer.email)
        .maybeSingle();

      if (card) {
        const newStamps = card.stamps + 1;
        const newTotal = card.total_stamps + 1;
        const stampsPerReward = 10; // default
        const newRewards = Math.floor(newStamps / stampsPerReward) - Math.floor(card.stamps / stampsPerReward);

        await supabaseAdmin
          .from("loyalty_cards")
          .update({
            stamps: newStamps % stampsPerReward,
            total_stamps: newTotal,
            rewards_earned: (await supabaseAdmin.from("loyalty_cards").select("rewards_earned").eq("id", card.id).single()).data?.rewards_earned + newRewards,
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id);
      } else {
        // Create a new loyalty card for the referrer
        await supabaseAdmin.from("loyalty_cards").insert({
          email: referrer.email,
          name: referrer.name,
          stamps: 1,
          total_stamps: 1,
          rewards_earned: 0,
          rewards_redeemed: 0,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
