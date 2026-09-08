import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { createPaidBooking } from "@/lib/create-booking";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentIntentId, fromRedirect, giftCardCode } = body;
  let { name, email, date, timeSlot, people, totalPrice, phone, isParty } = body;

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment intent ID" }, { status: 400 });
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  // Verify the payment intent actually succeeded
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not been completed" }, { status: 400 });
  }

  // If called from 3DS redirect with no booking details, read from Stripe metadata
  if (fromRedirect || !email || !date || !timeSlot) {
    const md = intent.metadata;
    if (md) {
      name = name || md.name || "";
      email = email || md.email || "";
      date = date || md.date || "";
      timeSlot = timeSlot || md.timeSlot || "";
      people = people ?? parseInt(md.people || "1", 10);
      totalPrice = totalPrice ?? parseFloat(md.totalPrice || "0");
      phone = phone || md.phone || "";
      isParty = isParty || md.type === "party";
    }
  }

  if (!email || !date || !timeSlot) {
    return NextResponse.json({ error: "Missing required fields and no metadata available" }, { status: 400 });
  }

  // Double-check the amount matches
  if (intent.amount !== Math.round(totalPrice * 100)) {
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }

  // The payment has already been captured, so the booking is always recorded —
  // capacity problems are flagged for the admin rather than dropping the booking.
  const result = await createPaidBooking({
    paymentRef: paymentIntentId,
    name,
    email,
    phone,
    date,
    timeSlot,
    people,
    totalPrice,
    isParty,
    discountCode: body.discountCode || intent.metadata?.discountCode || null,
  });

  if (!result.bookingId) {
    return NextResponse.json({ error: result.error || "Failed to create booking" }, { status: 500 });
  }

  // Redeem gift card if provided
  if (giftCardCode && result.bookingId) {
    try {
      // Calculate gift card amount (up to the total price)
      const { data: giftCard } = await supabaseAdmin
        .from("gift_cards")
        .select("balance")
        .eq("code", giftCardCode.trim().toUpperCase())
        .single();

      if (giftCard && giftCard.balance > 0) {
        const redeemAmount = Math.min(giftCard.balance, totalPrice);
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/gift-card-redeem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: giftCardCode.trim().toUpperCase(),
            amount: redeemAmount,
            bookingId: result.bookingId,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to redeem gift card:", e);
      // Don't fail the booking if gift card redemption fails
    }
  }

  return NextResponse.json({
    success: true,
    bookingId: result.bookingId,
    overCapacity: result.overCapacity,
    name, email, date, timeSlot, people, totalPrice,
  });
}
