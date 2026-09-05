import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync, getStripeKeysForMode } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createPaidBooking } from "@/lib/create-booking";

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
          metadata?: { bookingId?: string; subscriberId?: string; type?: string; order_number?: string };
          payment_status: string;
        };

        if (session.metadata?.bookingId && session.metadata?.type !== "subscription") {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", session.metadata.bookingId);
        }

        if (session.metadata?.subscriberId) {
          await supabaseAdmin
            .from("subscribers")
            .update({ status: "active", payment_status: "paid" })
            .eq("id", session.metadata.subscriberId);
        }

        // Shop order: mark as paid and decrement stock
        if (session.metadata?.order_number) {
          const { data: order } = await supabaseAdmin
            .from("shop_orders")
            .select("*")
            .eq("order_number", session.metadata.order_number)
            .single();

          if (order) {
            await supabaseAdmin
              .from("shop_orders")
              .update({ payment_status: "paid" })
              .eq("id", order.id);

            // Decrement stock
            for (const item of order.items) {
              const { data: product } = await supabaseAdmin
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .single();
              if (product) {
                const newStock = Math.max(0, (product.stock || 0) - item.quantity);
                await supabaseAdmin
                  .from("products")
                  .update({ stock: newStock })
                  .eq("id", item.product_id);
              }
            }

            // Send confirmation email
            await sendOrderConfirmationEmail({
              orderNumber: order.order_number,
              name: order.customer_name,
              email: order.customer_email,
              items: order.items,
              subtotal: order.subtotal,
              shippingCost: order.shipping_cost,
              total: order.total,
              shippingMethod: order.shipping_method,
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as {
          metadata?: { bookingId?: string; subscriberId?: string; type?: string; order_number?: string };
        };

        if (session.metadata?.bookingId && session.metadata?.type !== "subscription") {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "expired" })
            .eq("id", session.metadata.bookingId);
        }

        // Mark expired shop orders
        if (session.metadata?.order_number) {
          await supabaseAdmin
            .from("shop_orders")
            .update({ payment_status: "expired" })
            .eq("order_number", session.metadata.order_number);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as {
          metadata?: { bookingId?: string; subscriberId?: string };
        };

        if (charge.metadata?.bookingId) {
          await supabaseAdmin
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
            discountCode?: string;
          };
        };

        if (intent.metadata?.type === "subscription") break;

        // If bookingId exists, update it (old checkout session flow)
        if (intent.metadata?.bookingId) {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", intent.metadata.bookingId);
          break;
        }

        // Safety net for the new flow.
        //
        // Normally /api/confirm-booking creates the booking from the browser once
        // payment succeeds. If the customer closes the tab, loses signal, or the
        // browser suspends the page before that request lands, the payment would
        // succeed with no booking ever being recorded. createPaidBooking is
        // idempotent (keyed on the payment intent id and backed by a unique index)
        // so running it here cannot create a duplicate.
        const md = intent.metadata;
        if (md?.email && md?.date && md?.timeSlot) {
          const result = await createPaidBooking({
            paymentRef: intent.id,
            name: md.name || "",
            email: md.email,
            phone: md.phone || null,
            date: md.date,
            timeSlot: md.timeSlot,
            people: parseInt(md.people || "1", 10),
            totalPrice: md.totalPrice ? parseFloat(md.totalPrice) : intent.amount / 100,
            isParty: md.type === "party",
            discountCode: md.discountCode || null,
          });
          if (result.created) {
            console.warn(`[stripe-webhook] Recovered booking ${result.bookingId} for ${intent.id} — client never confirmed it.`);
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
          await supabaseAdmin
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
