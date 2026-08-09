import { NextRequest, NextResponse } from "next/server";
import { getStripe, getStripeKeys } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const keys = getStripeKeys();
  const webhookSecret = keys.webhookSecret;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string;
          metadata?: { bookingId?: string; subscriberId?: string; type?: string };
          payment_status: string;
        };

        if (session.metadata?.bookingId && session.metadata?.type !== "subscription") {
          await supabase
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", session.metadata.bookingId);
        }

        if (session.metadata?.subscriberId) {
          await supabase
            .from("subscribers")
            .update({ status: "active", payment_status: "paid" })
            .eq("id", session.metadata.subscriberId);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as {
          metadata?: { bookingId?: string; subscriberId?: string; type?: string };
        };

        if (session.metadata?.bookingId && session.metadata?.type !== "subscription") {
          await supabase
            .from("bookings")
            .update({ payment_status: "expired" })
            .eq("id", session.metadata.bookingId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as {
          metadata?: { bookingId?: string; subscriberId?: string };
        };

        if (charge.metadata?.bookingId) {
          await supabase
            .from("bookings")
            .update({ payment_status: "refunded" })
            .eq("id", charge.metadata.bookingId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
