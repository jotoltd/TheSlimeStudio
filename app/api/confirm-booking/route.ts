import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend, EMAIL_FROM, CONTACT_EMAIL, logEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentIntentId, fromRedirect } = body;
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

  // Idempotency: check if booking already exists for this payment intent
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", paymentIntentId);

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, bookingId: existing[0].id, name, email, date, timeSlot, people, totalPrice });
  }

  // Insert the booking as paid
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
    // Race condition: webhook may have created it between our check and insert
    // Try one more time to find it
    const { data: retry } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", paymentIntentId);
    if (retry && retry.length > 0) {
      return NextResponse.json({ success: true, bookingId: retry[0].id, name, email, date, timeSlot, people, totalPrice });
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Send admin notification email
  try {
    const r = getResend();
    if (r) {
      await r.emails.send({
        from: EMAIL_FROM,
        to: CONTACT_EMAIL,
        subject: `New Booking — ${name} on ${date} at ${timeSlot}`,
        html: `
          <h2>New Booking Received</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${timeSlot}</p>
          <p><strong>People:</strong> ${people}</p>
          <p><strong>Total:</strong> £${Number(totalPrice).toFixed(2)}</p>
          <p><strong>Payment:</strong> Paid</p>
        `,
      });
      await logEmail(CONTACT_EMAIL, `New Booking — ${name}`, "admin_notification", "sent");
    }
  } catch (e) {
    console.error("Failed to send admin notification:", e);
  }

  return NextResponse.json({ success: true, bookingId: data.id, name, email, date, timeSlot, people, totalPrice });
}
