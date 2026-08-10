import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subscriberId, name, email, price, boxName } = body as {
    subscriberId: string;
    name: string;
    email: string;
    price: number;
    boxName: string;
  };

  if (!subscriberId || !email || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
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
              name: `${boxName} — First Month`,
              description: "Monthly slime subscription box. Cancel anytime. Free UK delivery.",
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        subscriberId,
        type: "subscription",
        stripeMode: mode,
      },
      success_url: `${origin}/subscribe?status=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?status=cancelled`,
    });

    await supabase
      .from("subscribers")
      .update({ stripe_session_id: session.id })
      .eq("id", subscriberId);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("Stripe subscription checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
