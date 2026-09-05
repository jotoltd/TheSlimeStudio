import { supabaseAdmin } from "@/lib/supabase";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FREE-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const { data } = await supabaseAdmin
      .from("discount_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return generateCode() + Date.now().toString(36).toUpperCase();
}

export async function generateRewardCode(
  loyaltyCardId: string,
  email: string,
  name: string
): Promise<string | null> {
  try {
    const code = await uniqueCode();

    const { error: discError } = await supabaseAdmin
      .from("discount_codes")
      .insert({
        code,
        description: `Loyalty reward — free session for ${name}`,
        discount_type: "percentage",
        value: 100,
        scope: "booking",
        min_spend: 0,
        max_uses: 1,
        used_count: 0,
        active: true,
      });

    if (discError) {
      console.error("Failed to create reward discount code:", discError);
      return null;
    }

    await supabaseAdmin
      .from("loyalty_cards")
      .update({ reward_code: code })
      .eq("id", loyaltyCardId);

    return code;
  } catch (e) {
    console.error("Failed to generate reward code:", e);
    return null;
  }
}

export async function redeemRewardCode(code: string, email: string): Promise<void> {
  try {
    const { data: card } = await supabaseAdmin
      .from("loyalty_cards")
      .select("id, reward_code, rewards_earned, rewards_redeemed")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!card || card.reward_code !== code.toUpperCase()) return;

    await supabaseAdmin
      .from("loyalty_cards")
      .update({
        rewards_redeemed: (card.rewards_redeemed || 0) + 1,
        reward_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);
  } catch (e) {
    console.error("Failed to redeem reward code:", e);
  }
}
