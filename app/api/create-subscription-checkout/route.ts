import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sanitizeGclid } from "@/lib/google-ads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subscriberId, email } = body as {
    subscriberId: string;
    name: string;
    email: string;
    price: number;
    boxName: string;
  };

  if (!subscriberId || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Price and product name come from the database, never the client — the
  // request body's price/boxName are display hints only.
  const { data: settings } = await supabaseAdmin
    .from("subscription_settings")
    .select("price, box_name, enabled")
    .eq("id", 1)
    .single();

  if (!settings?.enabled) {
    return NextResponse.json({ error: "Subscriptions are not currently available" }, { status: 400 });
  }

  const price = Number(settings.price);
  const boxName = settings.box_name || "Slime Subscription";
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Subscription is not configured" }, { status: 500 });
  }

  // The subscriber row must exist — its id is stamped into payment metadata
  // and the webhook activates it, so an arbitrary id would be meaningless.
  const { data: subscriber } = await supabaseAdmin
    .from("subscribers")
    .select("id, email, status")
    .eq("id", subscriberId)
    .maybeSingle();

  if (!subscriber) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
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
      customer_email: subscriber.email || email,
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
      payment_intent_data: {
        description: `Subscription — ${boxName} — First Month`,
        metadata: { type: "subscription", subscriberId },
      },
      metadata: {
        subscriberId,
        type: "subscription",
        stripeMode: mode,
        price: String(price),
        gclid: sanitizeGclid(body.gclid) || "",
      },
      success_url: `${origin}/subscribe?status=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?status=cancelled`,
    });

    await supabaseAdmin
      .from("subscribers")
      .update({ stripe_session_id: session.id })
      .eq("id", subscriberId);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("Stripe subscription checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
