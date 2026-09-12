import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

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
      .select("code, balance, expiry_date")
      .eq("code", giftCardCode)
      .single();

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    return NextResponse.json({
      giftCard: {
        code: giftCard.code,
        amount: giftCard.balance,
        expiryDate: giftCard.expiry_date,
      },
    });
  } catch (err) {
    console.error("Gift card success error:", err);
    return NextResponse.json({ error: "Failed to retrieve gift card" }, { status: 500 });
  }
}
