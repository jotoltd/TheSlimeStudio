import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { redeemGiftCard } from "@/lib/gift-cards";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, amount, bookingId, shopOrderId } = body as {
    code: string;
    amount: number;
    bookingId?: string;
    shopOrderId?: string;
  };

  const result = await redeemGiftCard(code, amount, { bookingId, shopOrderId });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
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
