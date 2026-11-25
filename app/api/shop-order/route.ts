import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Public order lookup for the post-checkout success page. The Stripe session
// id / SumUp checkout reference acts as the bearer token — it's only known to
// the customer who just paid. Returns display-safe fields only.
export async function GET(req: NextRequest) {
  if (rateLimited(`shop-order:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const ref = new URL(req.url).searchParams.get("ref") || "";
  if (!ref || ref.length > 200) {
    return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("shop_orders")
    .select("id, order_number, items, subtotal, shipping_cost, total, shipping_method, shipping_address, shipping_city, shipping_postcode, customer_name, customer_email, payment_status, created_at")
    .eq("stripe_session_id", ref)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order: data });
}
