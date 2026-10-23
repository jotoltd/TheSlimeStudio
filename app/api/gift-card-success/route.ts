import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySumUpPayment } from "@/lib/payment";
import { gclidFromNotes, uploadClickConversion } from "@/lib/google-ads";
import { sendGiftCardEmail } from "@/lib/email";

export const runtime = "nodejs";

type GiftCardRow = {
  code: string;
  balance: number;
  initial_value: number | null;
  expiry_date: string | null;
  purchaser_name: string | null;
  purchaser_email: string;
  recipient_name: string | null;
  recipient_email: string | null;
  message: string | null;
};

// Sends the purchase email. Callers only invoke this when their update won
// the pending → active race, so it can't double-send.
async function notifyGiftCardPurchase(card: GiftCardRow) {
  try {
    await sendGiftCardEmail({
      code: card.code,
      amount: Number(card.initial_value ?? card.balance) || 0,
      expiryDate: card.expiry_date,
      purchaserName: card.purchaser_name || "there",
      purchaserEmail: card.purchaser_email,
      recipientName: card.recipient_name,
      recipientEmail: card.recipient_email,
      message: card.message,
    });
  } catch (e) {
    console.error("Failed to send gift card email:", e);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const sumupRef = searchParams.get("ref");

  // SumUp gift card — redirect_url brings the buyer back with the checkout ref
  if (sumupRef) {
    try {
      const verification = await verifySumUpPayment(sumupRef);
      if (!verification.paid) {
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
      }
      const { data: card } = await supabaseAdmin
        .from("gift_cards")
        .select("id, code, balance, initial_value, expiry_date, purchaser_name, purchaser_email, recipient_name, recipient_email, message, ad_source")
        .eq("payment_reference", sumupRef)
        .single();
      if (!card) {
        return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
      }
      // Payment verified — activate the card
      const { data: activated } = await supabaseAdmin
        .from("gift_cards")
        .update({ status: "active" })
        .eq("id", card.id)
        .eq("status", "pending")
        .select("id");
      if (activated && activated.length > 0) {
        await notifyGiftCardPurchase(card);
      }
      // Google Ads offline conversion — orderId matches the browser tag's
      // transaction_id (the card code shown on the success page).
      const gclid = gclidFromNotes(card.ad_source);
      if (gclid) {
        await uploadClickConversion({ gclid, value: card.balance, orderId: card.code }).catch(() => {});
      }
      return NextResponse.json({
        giftCard: {
          code: card.code,
          amount: card.balance,
          expiryDate: card.expiry_date,
          purchaserEmail: card.purchaser_email,
        },
      });
    } catch (err) {
      console.error("SumUp gift card success error:", err);
      return NextResponse.json({ error: "Failed to retrieve gift card" }, { status: 500 });
    }
  }

  if (!sessionId) {
    return NextResponse.json({ error: "No session ID provided" }, { status: 400 });
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const giftCardCode = session.metadata?.gift_card_code;
    const amount = session.metadata?.amount;

    if (!giftCardCode || !amount) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
    }

    const { data: giftCard } = await supabaseAdmin
      .from("gift_cards")
      .select("id, code, balance, initial_value, expiry_date, purchaser_name, purchaser_email, recipient_name, recipient_email, message, ad_source")
      .eq("code", giftCardCode)
      .single();

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    // Payment verified — activate the card
    const { data: activated } = await supabaseAdmin
      .from("gift_cards")
      .update({ status: "active" })
      .eq("id", giftCard.id)
      .eq("status", "pending")
      .select("id");
    if (activated && activated.length > 0) {
      await notifyGiftCardPurchase(giftCard);
    }

    const gclid = gclidFromNotes(giftCard.ad_source);
    if (gclid) {
      await uploadClickConversion({ gclid, value: giftCard.balance, orderId: giftCard.code }).catch(() => {});
    }

    return NextResponse.json({
      giftCard: {
        code: giftCard.code,
        amount: giftCard.balance,
        expiryDate: giftCard.expiry_date,
        purchaserEmail: giftCard.purchaser_email,
      },
    });
  } catch (err) {
    console.error("Gift card success error:", err);
    return NextResponse.json({ error: "Failed to retrieve gift card" }, { status: 500 });
  }
}
