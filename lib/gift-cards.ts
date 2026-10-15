import { supabaseAdmin } from "@/lib/supabase";

export type RedeemResult =
  | { success: true; remainingBalance: number; redeemedAmount: number }
  | { success: false; error: string; status: number };

/**
 * Deducts `amount` from a gift card's balance and records the redemption.
 * Call this directly — do NOT self-fetch /api/gift-card-redeem, which depends
 * on NEXT_PUBLIC_BASE_URL being set (it isn't).
 */
export async function redeemGiftCard(
  code: string,
  amount: number,
  refs: { bookingId?: string; shopOrderId?: string }
): Promise<RedeemResult> {
  if (!code || !amount || amount <= 0) {
    return { success: false, error: "Gift card code and a positive amount are required", status: 400 };
  }
  if (!refs.bookingId && !refs.shopOrderId) {
    return { success: false, error: "Either bookingId or shopOrderId is required", status: 400 };
  }

  const { data: giftCard, error } = await supabaseAdmin
    .from("gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (error || !giftCard) {
    return { success: false, error: "Gift card not found", status: 404 };
  }
  if (giftCard.status !== "active") {
    return { success: false, error: `Gift card is ${giftCard.status}`, status: 400 };
  }
  if (giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date()) {
    return { success: false, error: "Gift card has expired", status: 400 };
  }
  if (giftCard.balance < amount) {
    return { success: false, error: `Insufficient balance. Available: £${giftCard.balance.toFixed(2)}`, status: 400 };
  }

  const newBalance = giftCard.balance - amount;
  // Conditional update on the balance we read — if another redemption beat us
  // to it, zero rows match and we fail instead of overdrawing the card.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("gift_cards")
    .update({
      balance: newBalance,
      status: newBalance === 0 ? "used" : "active",
      redeemed_at: newBalance === 0 ? new Date().toISOString() : giftCard.redeemed_at,
    })
    .eq("id", giftCard.id)
    .eq("balance", giftCard.balance)
    .select("id");

  if (updateError) {
    console.error("Failed to update gift card balance:", updateError);
    return { success: false, error: "Failed to redeem gift card", status: 500 };
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: "Card balance changed — please try again", status: 409 };
  }

  const { error: redemptionError } = await supabaseAdmin.from("gift_card_redemptions").insert({
    gift_card_id: giftCard.id,
    amount,
    booking_id: refs.bookingId || null,
    shop_order_id: refs.shopOrderId || null,
  });
  if (redemptionError) {
    // Roll the balance back — a spent card with no audit record is worse
    // than a failed checkout retry.
    console.error("Failed to record redemption, restoring balance:", redemptionError);
    const { error: rollbackError } = await supabaseAdmin
      .from("gift_cards")
      .update({
        balance: giftCard.balance,
        status: giftCard.status,
        redeemed_at: giftCard.redeemed_at,
      })
      .eq("id", giftCard.id)
      .eq("balance", newBalance);
    if (rollbackError) {
      console.error("Rollback failed — gift card balance deducted without record:", rollbackError);
    }
    return { success: false, error: "Failed to redeem gift card — please try again", status: 500 };
  }

  return { success: true, remainingBalance: newBalance, redeemedAmount: amount };
}
