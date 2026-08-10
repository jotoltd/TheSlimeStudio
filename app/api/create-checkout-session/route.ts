import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync, getPublishableKeyAsync } from "@/lib/stripe";
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

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured. Set STRIPE_TEST_SECRET_KEY or STRIPE_LIVE_SECRET_KEY in .env.local" }, { status: 500 });
  }

  const mode = await getStripeModeAsync();
  const origin = req.headers.get("origin") || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: isParty
                ? `Birthday Party Booking — ${people} children`
                : `Slime Studio Session — ${people} ${people === 1 ? "person" : "people"}`,
              description: `${new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at ${timeSlot}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        type: isParty ? "party" : "booking",
        stripeMode: mode,
      },
      success_url: `${origin}/booking?status=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking?status=cancelled`,
    });

    // Update booking with payment status
    await supabase
      .from("bookings")
      .update({ payment_status: "pending", stripe_session_id: session.id })
      .eq("id", bookingId);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
