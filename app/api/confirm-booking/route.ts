import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { createPaidBooking } from "@/lib/create-booking";
import { redeemGiftCard } from "@/lib/gift-cards";
import { supabaseAdmin } from "@/lib/supabase";
import { sendCapiEvent, metaContextFromRequest } from "@/lib/capi";
import { sendPushToCustomer } from "@/lib/apns";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentIntentId, fromRedirect } = body;
  let giftCardCode = body.giftCardCode as string | undefined;
  let giftCardAmount = Number(body.giftCardAmount) || 0;
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

  // Booking details come from the PaymentIntent metadata we stamped at
  // creation — the client can't confirm different (or bigger) details than
  // it actually paid for. Body values are only a fallback for intents that
  // predate metadata stamping.
  const md = intent.metadata;
  if (md) {
    name = md.name || name || "";
    email = md.email || email || "";
    date = md.date || date || "";
    timeSlot = md.timeSlot || timeSlot || "";
    people = parseInt(md.people || "", 10) || people;
    totalPrice = md.totalPrice ? parseFloat(md.totalPrice) : totalPrice;
    phone = md.phone || phone || "";
    isParty = md.type === "party";
    giftCardCode = giftCardCode || md.giftCardCode || undefined;
    giftCardAmount = giftCardAmount || Number(md.giftCardAmount) || 0;
  }
  people = Math.min(Math.max(1, Math.floor(Number(people)) || 1), 50);
  void fromRedirect;

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
    discountCode: intent.metadata?.discountCode || body.discountCode || null,
    adSource: intent.metadata?.adSource || body.adSource || null,
    gclid: intent.metadata?.gclid || body.gclid || null,
  });

  if (!result.bookingId) {
    return NextResponse.json({ error: result.error || "Failed to create booking" }, { status: 500 });
  }

  // Server-side Purchase event — event_id matches the browser pixel event
  // (paymentIntentId) so Meta dedupes if both arrive.
  const meta = metaContextFromRequest(req, body);
  await sendCapiEvent({
    eventName: "Purchase",
    eventId: paymentIntentId,
    email, name, phone,
    value: totalPrice,
    sourceUrl: "https://theslimestudio.co.uk/booking",
    clientIp: intent.metadata?.cip || meta.clientIp,
    userAgent: intent.metadata?.cua || meta.userAgent,
    fbp: intent.metadata?.fbp || body.fbp,
    fbc: intent.metadata?.fbc || body.fbc,
  });

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
        // giftCardAmount is what the card covered on the client; fall back to
        // the paid total for older callers.
        const cover = giftCardAmount > 0 ? giftCardAmount : totalPrice;
        const redeemAmount = Math.min(giftCard.balance, cover);
        const red = await redeemGiftCard(giftCardCode, redeemAmount, { bookingId: result.bookingId });
        if (!red.success) {
          console.error("Gift card redeem failed:", red.error);
        }
      }
    } catch (e) {
      console.error("Failed to redeem gift card:", e);
      // Don't fail the booking if gift card redemption fails
    }
  }

  // Booking confirmation push — best-effort; a failure never blocks the
  // booking response. Looks the customer up by email so it works even when
  // the booking wasn't stamped with a customer_id.
  try {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", String(email).toLowerCase())
      .maybeSingle();
    if (customer) {
      const when = `${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })} at ${timeSlot}`;
      await sendPushToCustomer(customer.id, {
        title: "You're booked in!",
        body: `${people} slime maker${people > 1 ? "s" : ""} — ${when}. See you at the studio!`,
        data: { kind: "booking", bookingId: String(result.bookingId) },
      });
    }
  } catch (e) {
    console.error("Booking push failed:", e);
  }

  return NextResponse.json({
    success: true,
    bookingId: result.bookingId,
    overCapacity: result.overCapacity,
    name, email, date, timeSlot, people, totalPrice,
  });
}
