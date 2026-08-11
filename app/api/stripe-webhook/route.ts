import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync, getStripeKeysForMode } from "@/lib/stripe";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const mode = await getStripeModeAsync();
  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const keys = getStripeKeysForMode(mode);
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

      case "payment_intent.succeeded": {
        const intent = event.data.object as {
          id: string;
          amount: number;
          metadata?: {
            bookingId?: string;
            type?: string;
            name?: string;
            email?: string;
            date?: string;
            timeSlot?: string;
            people?: string;
            totalPrice?: string;
            phone?: string;
          };
        };

        if (intent.metadata?.type === "subscription") break;

        // If bookingId exists, update it (old checkout session flow)
        if (intent.metadata?.bookingId) {
          await supabase
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", intent.metadata.bookingId);
          break;
        }

        // New flow: create booking from metadata if it doesn't exist yet
        const md = intent.metadata;
        if (md?.email && md?.date && md?.timeSlot) {
          // Check if booking already exists for this payment intent
          const { data: existing } = await supabaseAdmin
            .from("bookings")
            .select("id")
            .eq("stripe_session_id", intent.id)
            .single();

          if (!existing) {
            await supabaseAdmin.from("bookings").insert({
              date: md.date,
              time_slot: md.timeSlot,
              people: parseInt(md.people || "1", 10),
              total_price: parseFloat(md.totalPrice || "0"),
              name: md.name || "",
              email: md.email,
              phone: md.phone || null,
              is_party: md.type === "party",
              payment_status: "paid",
              stripe_session_id: intent.id,
            });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as {
          id: string;
          metadata?: { bookingId?: string; type?: string };
        };

        if (intent.metadata?.bookingId && intent.metadata?.type !== "subscription") {
          await supabase
            .from("bookings")
            .update({ payment_status: "unpaid" })
            .eq("id", intent.metadata.bookingId);
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
