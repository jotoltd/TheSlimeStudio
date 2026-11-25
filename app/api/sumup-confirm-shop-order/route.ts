import { NextRequest, NextResponse } from "next/server";
import { getSumUpKey } from "@/lib/payment";
import { supabaseAdmin } from "@/lib/supabase";
import { claimShopOrder, settleShopOrder, type ShopOrderRow } from "@/lib/order-settlement";
import { sanitizeGclid } from "@/lib/google-ads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { checkoutRef, gclid } = await req.json() as { checkoutRef: string; gclid?: string };

  if (!checkoutRef) {
    return NextResponse.json({ error: "Missing checkout reference" }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from("shop_orders")
    .select("*")
    .eq("stripe_session_id", checkoutRef)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ success: true, orderNumber: order.order_number });
  }

  const key = getSumUpKey();
  try {
    const listRes = await fetch(`https://api.sumup.com/v0.1/checkouts?checkout_reference=${encodeURIComponent(checkoutRef)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const listData = await listRes.json();

    if (!listRes.ok) {
      console.error("SumUp list checkouts error:", listData);
      return NextResponse.json({ error: "Failed to verify payment with SumUp" }, { status: 500 });
    }

    const checkout = Array.isArray(listData) && listData.length > 0 ? listData[0] : null;
    if (!checkout) {
      return NextResponse.json({ error: "Checkout not found on SumUp" }, { status: 404 });
    }

    if (checkout.status !== "PAID") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Atomic claim — the SumUp webhook may be settling this order concurrently.
    const won = await claimShopOrder(order.id);
    if (!won) {
      return NextResponse.json({ success: true, orderNumber: order.order_number });
    }

    await settleShopOrder(order as ShopOrderRow, { gclid: sanitizeGclid(gclid) || undefined });

    return NextResponse.json({ success: true, orderNumber: order.order_number });
  } catch (e) {
    console.error("SumUp confirm shop order error:", e);
    return NextResponse.json({ error: "Failed to confirm order" }, { status: 500 });
  }
}
