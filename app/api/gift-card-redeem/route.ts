import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// NOTE: there is intentionally no POST handler. Redemption only happens inside
// verified payment flows via lib/gift-cards.redeemGiftCard — a public redeem
// endpoint let anyone drain a card against an arbitrary booking id.

// GET endpoint to validate a gift card without redeeming it.
// Rate-limited: codes are enumerable, so this can't be an unlimited oracle.
export async function GET(req: NextRequest) {
  if (rateLimited(`giftcard-lookup:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Gift card code is required" }, { status: 400 });
  }

  const { data: giftCard, error: giftCardError } = await supabaseAdmin
    .from("gift_cards")
    .select("balance, initial_value, expiry_date, status")
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
