import { supabaseAdmin } from "@/lib/supabase";
import { sendGiftCardEmail } from "@/lib/email";
import { gclidFromNotes, uploadClickConversion } from "@/lib/google-ads";

/**
 * Flips a pending gift card to active. Only the call that wins the
 * pending → active transition sends the gift-card email, so it is safe to
 * call from both the Stripe webhook and the client confirm endpoint —
 * the email goes out exactly once.
 */
export async function activateGiftCard(code: string, orderId: string) {
  const { data: activated } = await supabaseAdmin
    .from("gift_cards")
    .update({ status: "active" })
    .eq("code", code)
    .eq("status", "pending")
    .select("id");

  if (activated && activated.length > 0) {
    try {
      const { data: gc } = await supabaseAdmin
        .from("gift_cards")
        .select("code, balance, initial_value, expiry_date, purchaser_name, purchaser_email, recipient_name, recipient_email, message")
        .eq("code", code)
        .single();
      if (gc) {
        await sendGiftCardEmail({
          code: gc.code,
          amount: Number(gc.initial_value ?? gc.balance) || 0,
          expiryDate: gc.expiry_date,
          purchaserName: gc.purchaser_name || "there",
          purchaserEmail: gc.purchaser_email,
          recipientName: gc.recipient_name,
          recipientEmail: gc.recipient_email,
          message: gc.message,
        });
      }
    } catch (e) {
      console.error("Failed to send gift card email:", e);
    }
  }

  // Google Ads offline conversion — the card's ad_source carries the
  // gclid; orderId matches the browser tag's transaction_id (card code).
  const { data: card } = await supabaseAdmin
    .from("gift_cards")
    .select("ad_source, initial_value, balance")
    .eq("code", code)
    .single();
  const cardGclid = gclidFromNotes(card?.ad_source);
  if (cardGclid && card) {
    await uploadClickConversion({
      gclid: cardGclid,
      value: Number(card.initial_value ?? card.balance) || 0,
      orderId,
    }).catch(() => {});
  }
}

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
