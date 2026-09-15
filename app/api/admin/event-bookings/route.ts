import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getStripeAsync } from "@/lib/stripe";

export const runtime = "nodejs";

// GET — list all event bookings (admin)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("special_event_bookings")
    .select(`
      *,
      event:special_events(id, title, category, price, pricing_model),
      instance:special_event_instances(id, date, start_time, capacity, status)
    `)
    .order("created_at", { ascending: false });

  if (eventId) query = query.eq("event_id", eventId);
  if (status) query = query.eq("payment_status", status);

  const { data: bookings, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: bookings || [] });
}

// POST — update booking status (mark paid, cancel, check in)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, id } = body;

  if (!id) return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });

  if (action === "mark_paid") {
    const { error } = await supabaseAdmin
      .from("special_event_bookings")
      .update({ payment_status: "paid" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "mark_pending") {
    const { error } = await supabaseAdmin
      .from("special_event_bookings")
      .update({ payment_status: "pending" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "cancel") {
    // Fetch the booking first so we can refund if it was paid
    const { data: evtBooking } = await supabaseAdmin
      .from("special_event_bookings")
      .select("*")
      .eq("id", id)
      .single();

    let refundResult: { refunded: boolean; error?: string } = { refunded: false };

    if (evtBooking?.payment_status === "paid" && evtBooking?.payment_reference) {
      const ref = evtBooking.payment_reference as string;
      try {
        const stripe = await getStripeAsync();
        if (stripe) {
          if (ref.startsWith("pi_")) {
            const refund = await stripe.refunds.create({ payment_intent: ref });
            refundResult = { refunded: refund.status === "succeeded" };
          } else if (ref.startsWith("cs_")) {
            const session = await stripe.checkout.sessions.retrieve(ref);
            if (session.payment_intent) {
              const refund = await stripe.refunds.create({ payment_intent: session.payment_intent as string });
              refundResult = { refunded: refund.status === "succeeded" };
            }
          }
        }
      } catch (e) {
        console.error("Event booking Stripe refund error:", e);
        refundResult = { refunded: false, error: e instanceof Error ? e.message : "Unknown error" };
      }
    }

    const newStatus = refundResult.refunded ? "refunded" : "cancelled";
    const { error } = await supabaseAdmin
      .from("special_event_bookings")
      .update({ payment_status: newStatus })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, refunded: refundResult.refunded, refundError: refundResult.error });
  }

  if (action === "delete") {
    const { error } = await supabaseAdmin
      .from("special_event_bookings")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
