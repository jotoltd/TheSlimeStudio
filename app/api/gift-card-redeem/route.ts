import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, amount, bookingId, shopOrderId } = body as {
    code: string;
    amount: number;
    bookingId?: string;
    shopOrderId?: string;
  };

  if (!code || !amount) {
    return NextResponse.json({ error: "Gift card code and amount are required" }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Redemption amount must be greater than 0" }, { status: 400 });
  }

  if (!bookingId && !shopOrderId) {
    return NextResponse.json({ error: "Either bookingId or shopOrderId is required" }, { status: 400 });
  }

  // Find the gift card
  const { data: giftCard, error: giftCardError } = await supabaseAdmin
    .from("gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (giftCardError || !giftCard) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }

  // Check if gift card is active
  if (giftCard.status !== "active") {
    return NextResponse.json({ error: `Gift card is ${giftCard.status}` }, { status: 400 });
  }

  // Check if gift card has expired
  if (giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date()) {
    return NextResponse.json({ error: "Gift card has expired" }, { status: 400 });
  }

  // Check if sufficient balance
  if (giftCard.balance < amount) {
    return NextResponse.json({ error: `Insufficient balance. Available: £${giftCard.balance.toFixed(2)}` }, { status: 400 });
  }

  // Calculate new balance
  const newBalance = giftCard.balance - amount;

  // Update gift card balance and record redemption
  const { error: updateError } = await supabaseAdmin
    .from("gift_cards")
    .update({
      balance: newBalance,
      status: newBalance === 0 ? "used" : "active",
      redeemed_at: newBalance === 0 ? new Date().toISOString() : giftCard.redeemed_at,
    })
    .eq("id", giftCard.id);

  if (updateError) {
    console.error("Failed to update gift card balance:", updateError);
    return NextResponse.json({ error: "Failed to redeem gift card" }, { status: 500 });
  }

  // Record redemption history
  const { error: redemptionError } = await supabaseAdmin.from("gift_card_redemptions").insert({
    gift_card_id: giftCard.id,
    amount,
    booking_id: bookingId || null,
    shop_order_id: shopOrderId || null,
  });

  if (redemptionError) {
    console.error("Failed to record redemption:", redemptionError);
    // Don't fail the redemption if history recording fails
  }

  return NextResponse.json({
    success: true,
    remainingBalance: newBalance,
    redeemedAmount: amount,
  });
}

// GET endpoint to validate a gift card without redeeming it
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Gift card code is required" }, { status: 400 });
  }

  const { data: giftCard, error: giftCardError } = await supabaseAdmin
    .from("gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (giftCardError || !giftCard) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }

  // Check if gift card is active
  if (giftCard.status !== "active") {
    return NextResponse.json({ error: `Gift card is ${giftCard.status}` }, { status: 400 });
  }

  // Check if gift card has expired
  if (giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date()) {
    return NextResponse.json({ error: "Gift card has expired" }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    balance: giftCard.balance,
    initial_value: giftCard.initial_value,
    expiry_date: giftCard.expiry_date,
  });
}
