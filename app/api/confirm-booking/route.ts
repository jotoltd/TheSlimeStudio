import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { paymentIntentId, name, email, date, timeSlot, people, totalPrice, phone, isParty } = await req.json();

  if (!paymentIntentId || !email || !date || !timeSlot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

  // Double-check the amount matches
  if (intent.amount !== Math.round(totalPrice * 100)) {
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }

  // Now insert the booking as paid
  const { data, error } = await supabaseAdmin.from("bookings").insert({
    date,
    time_slot: timeSlot,
    people,
    total_price: totalPrice,
    name,
    email,
    phone: phone || null,
    is_party: isParty || false,
    payment_status: "paid",
    stripe_session_id: paymentIntentId,
  }).select().single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true, bookingId: data.id });
}
