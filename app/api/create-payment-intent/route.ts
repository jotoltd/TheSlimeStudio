import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId, name, email, date, timeSlot, people, totalPrice, isParty } = body as {
    bookingId: string;
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    isParty?: boolean;
  };

  if (!bookingId || !email || !totalPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate email format
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // 30-min notice: don't allow booking a slot starting within 30 minutes
  if (date && timeSlot) {
    const [h, m] = timeSlot.split(":").map(Number);
    const slotTime = new Date(date + "T00:00:00");
    slotTime.setHours(h, m, 0, 0);
    const diffMs = slotTime.getTime() - Date.now();
    if (diffMs < 30 * 60 * 1000) {
      return NextResponse.json({ error: "Bookings require at least 30 minutes notice. Please choose a later time slot." }, { status: 400 });
    }
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const mode = await getStripeModeAsync();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId,
        type: isParty ? "party" : "booking",
        stripeMode: mode,
      },
      receipt_email: email,
      description: isParty
        ? `Birthday Party Booking — ${people} children`
        : `Slime Studio Session — ${people} ${people === 1 ? "person" : "people"} — ${date} at ${timeSlot}`,
    });

    await supabase
      .from("bookings")
      .update({ payment_status: "pending", stripe_session_id: intent.id })
      .eq("id", bookingId);

    return NextResponse.json({ clientSecret: intent.client_secret, mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Payment intent error:", msg);
    return NextResponse.json({ error: `Failed to create payment intent: ${msg}` }, { status: 500 });
  }
}
