import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripeModeAsync, getStripeKeysForMode } from "@/lib/stripe";

export const runtime = "nodejs";

// POST — create a booking for an event instance
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { instance_id, event_id, name, email, phone, quantity } = body;

  if (!instance_id || !event_id || !name || !email || !quantity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (quantity < 1) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }

  // Fetch the instance and event
  const { data: instance, error: instError } = await supabaseAdmin
    .from("special_event_instances")
    .select("*")
    .eq("id", instance_id)
    .single();
  if (instError || !instance) {
    return NextResponse.json({ error: "Event instance not found" }, { status: 404 });
  }

  if (instance.status === "cancelled") {
    return NextResponse.json({ error: "This session has been cancelled" }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("special_events")
    .select("*")
    .eq("id", event_id)
    .single();
  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.is_active) {
    return NextResponse.json({ error: "This event is no longer available" }, { status: 400 });
  }

  // Check capacity
  const capacity = instance.capacity || event.capacity;
  const { data: existingBookings } = await supabaseAdmin
    .from("special_event_bookings")
    .select("quantity")
    .eq("instance_id", instance_id)
    .eq("payment_status", "paid");
  const booked = (existingBookings || []).reduce((sum: number, b: any) => sum + b.quantity, 0);
  const remaining = capacity - booked;

  if (quantity > remaining) {
    return NextResponse.json({ error: `Only ${remaining} spots remaining` }, { status: 400 });
  }

  const totalPrice = parseFloat(event.price) * quantity;

  // Create the booking record (pending payment)
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("special_event_bookings")
    .insert({
      instance_id,
      event_id,
      name: name.trim(),
      email: email.trim(),
      phone: phone || null,
      quantity,
      total_price: totalPrice,
      payment_status: "pending",
    })
    .select()
    .single();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // Determine payment provider
  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("payment_provider")
    .eq("id", 1)
    .single();
  const provider = settings?.payment_provider || "stripe";

  // Create checkout
  if (provider === "sumup") {
    return createSumUpCheckout(booking, event, instance, totalPrice);
  }
  return createStripeCheckout(booking, event, instance, totalPrice);
}

async function createStripeCheckout(booking: any, event: any, instance: any, total: number) {
  const mode = await getStripeModeAsync();
  const keys = getStripeKeysForMode(mode);
  const STRIPE_SECRET = keys.secretKey;

  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theslimestudio.co.uk";

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][unit_amount]": String(Math.round(total * 100)),
      "line_items[0][price_data][product_data][name]": `${event.title} — ${instance.date} ${instance.start_time}`,
      success_url: `${origin}/events/${event.id}?booked=1`,
      cancel_url: `${origin}/events/${event.id}?cancelled=1`,
      "metadata[event_booking_id]": booking.id,
      "metadata[booking_type]": "special_event",
      "metadata[instance_id]": instance.id,
      "metadata[event_id]": event.id,
      customer_email: booking.email,
    }).toString(),
  });

  const data = await res.json();
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 500 });
  }

  // Update booking with payment reference
  await supabaseAdmin
    .from("special_event_bookings")
    .update({ payment_reference: data.id })
    .eq("id", booking.id);

  return NextResponse.json({ url: data.url });
}

async function createSumUpCheckout(booking: any, event: any, instance: any, total: number) {
  const SUMUP_KEY = process.env.SUMUP_API_KEY;
  if (!SUMUP_KEY) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theslimestudio.co.uk";

  const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUMUP_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: `SLM-EVENT-${booking.id.slice(0, 8)}`,
      amount: total.toFixed(2),
      currency: "GBP",
      merchant_code: process.env.SUMUP_MERCHANT_CODE || "",
      description: `${event.title} — ${instance.date} ${instance.start_time}`,
      return_url: `${origin}/events?booked=1`,
    }),
  });

  const data = await res.json();
  if (data.error || !data.id) {
    return NextResponse.json({ error: data.error?.message || "Failed to create checkout" }, { status: 500 });
  }

  await supabaseAdmin
    .from("special_event_bookings")
    .update({ payment_reference: data.id })
    .eq("id", booking.id);

  return NextResponse.json({ url: data.hosted_checkout_url || data.url });
}
