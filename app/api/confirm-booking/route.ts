import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { createPaidBooking } from "@/lib/create-booking";
import { supabaseAdmin } from "@/lib/supabase";
import { sendCapiEvent, metaContextFromRequest } from "@/lib/capi";
import { sendPushToCustomerOrDevice } from "@/lib/apns";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentIntentId, fromRedirect } = body;
  // Gift card details are only trusted from PaymentIntent metadata (stamped
  // server-side at intent creation) — client-supplied amounts could inflate
  // the redemption beyond what the card actually covered.
  let giftCardCode: string | undefined;
  let giftCardAmount = 0;
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
    giftCardCode = md.giftCardCode || undefined;
    giftCardAmount = Number(md.giftCardAmount) || 0;
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
    giftCardCode: giftCardCode || null,
    giftCardAmount,
    adSource: intent.metadata?.adSource || body.adSource || null,
    gclid: intent.metadata?.gclid || body.gclid || null,
    deviceToken: intent.metadata?.deviceToken || body.deviceToken || null,
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

  // Gift card redemption + discount usage counting happen inside
  // createPaidBooking (keyed on paymentRef, so the webhook recovery path
  // can't double-redeem or skip them).

  // Booking confirmation push — best-effort; a failure never blocks the
  // booking response. Reaches the buying device directly (guests too) plus
  // every device linked to the customer account.
  try {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", String(email).toLowerCase())
      .maybeSingle();
    const when = `${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })} at ${timeSlot}`;
    await sendPushToCustomerOrDevice(customer?.id, intent.metadata?.deviceToken || body.deviceToken, {
      title: "You're booked in!",
      body: `${people} slime maker${people > 1 ? "s" : ""} — ${when}. See you at the studio!`,
      data: { kind: "booking", bookingId: String(result.bookingId), link: "account" },
    });
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
