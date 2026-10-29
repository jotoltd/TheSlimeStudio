import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { activateGiftCard } from "@/lib/gift-cards";

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
  return NextResponse.json({ ok: true, code: intent.metadata.gift_card_code });
}
