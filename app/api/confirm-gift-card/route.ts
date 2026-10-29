import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { activateGiftCard } from "@/lib/gift-cards";
import { sendPushToCustomerOrDevice } from "@/lib/apns";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Called by the app after PaymentSheet completes so the card activates even
// if the Stripe webhook is delayed or not registered for the current mode.
// Activation is keyed on the pending → active transition, so racing the
// webhook sends the gift-card email exactly once.
export async function POST(req: NextRequest) {
  const { paymentIntentId } = await req.json();
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment intent ID" }, { status: 400 });
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not been completed" }, { status: 400 });
  }
  if (intent.metadata?.type !== "gift_card" || !intent.metadata?.gift_card_code) {
    return NextResponse.json({ error: "Not a gift card payment" }, { status: 400 });
  }

  await activateGiftCard(intent.metadata.gift_card_code, intent.metadata.gift_card_code);

  // Confirmation push to the purchaser — best-effort.
  try {
    const { data: card } = await supabaseAdmin
      .from("gift_cards")
      .select("purchaser_email, initial_value, device_token")
      .eq("code", intent.metadata.gift_card_code)
      .single();
    if (card?.purchaser_email || card?.device_token) {
      const { data: customer } = card?.purchaser_email
        ? await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("email", String(card.purchaser_email).toLowerCase())
            .maybeSingle()
        : { data: null };
      await sendPushToCustomerOrDevice(customer?.id, card?.device_token || intent.metadata.deviceToken, {
        title: "Gift card on its way",
        body: `Your £${Number(card?.initial_value || 0).toFixed(0)} gift card ${intent.metadata.gift_card_code} is active — check your email.`,
        data: { kind: "gift_card", code: intent.metadata.gift_card_code, link: "giftcards" },
      });
    }
  } catch (e) {
    console.error("Gift card push failed:", e);
  }

  return NextResponse.json({ ok: true, code: intent.metadata.gift_card_code });
}
