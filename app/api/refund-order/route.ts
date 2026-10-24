import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getStripeAsync } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/refund-order — admin refunds a paid shop order. Stripe orders are
// refunded through the API for real; SumUp hosted checkouts have no refund
// API, so we flag them for a manual refund in the SumUp app instead of
// silently pretending money moved.
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const { data: order, error } = await supabaseAdmin
    .from("shop_orders").select("*").eq("id", orderId).single();
  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "Only paid orders can be refunded" }, { status: 400 });
  }
  if (!order.stripe_session_id) {
    return NextResponse.json({ error: "No payment reference on this order" }, { status: 400 });
  }

  const isSumUp = order.stripe_session_id.startsWith("SLM-");

  if (isSumUp) {
    // SumUp has no hosted-checkout refund API — flag the order as pending a
    // manual refund. The admin issues the refund in the SumUp app/dashboard,
    // then confirms it on the order, which marks it refunded for real. This
    // keeps a forgotten manual refund from looking completed.
    await supabaseAdmin
      .from("shop_orders").update({ payment_status: "refund_pending" }).eq("id", orderId);
    return NextResponse.json({ success: true, refunded: false, manualRefund: "sumup" });
  }

  let refunded = false;
  let refundError: string | undefined;
  try {
    const stripe = await getStripeAsync();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }
    if (order.stripe_session_id.startsWith("pi_")) {
      const refund = await stripe.refunds.create({ payment_intent: order.stripe_session_id });
      refunded = refund.status === "succeeded";
    } else if (order.stripe_session_id.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_intent) {
        const refund = await stripe.refunds.create({ payment_intent: session.payment_intent as string });
        refunded = refund.status === "succeeded";
      }
    } else {
      return NextResponse.json(
        { error: "Unrecognised payment reference — refund manually in Stripe" },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("Order refund error:", e);
    refundError = e instanceof Error ? e.message : "Unknown error";
  }

  if (refunded) {
    await supabaseAdmin
      .from("shop_orders").update({ payment_status: "refunded" }).eq("id", orderId);
    return NextResponse.json({ success: true, refunded: true });
  }

  return NextResponse.json(
    { error: `Refund did not complete${refundError ? `: ${refundError}` : ""}. The order has NOT been marked refunded.` },
    { status: 502 }
  );
}
