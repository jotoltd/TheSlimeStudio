import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, date, timeSlot, people, totalPrice, isParty } = body as {
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    isParty?: boolean;
  };

  if (!email || !totalPrice || !date || !timeSlot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate email format
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Don't allow booking in the past
  const [h, m] = timeSlot.split(":").map(Number);
  const slotTime = new Date(date + "T00:00:00");
  slotTime.setHours(h, m, 0, 0);
  if (slotTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "Cannot book a session in the past. Please choose a future time slot." }, { status: 400 });
  }

  // Server-side capacity check before creating payment intent
  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("slot_capacity, max_daily_bookings")
    .eq("id", 1)
    .single();
  const slotCap = settings?.slot_capacity || 5;
  const maxDaily = settings?.max_daily_bookings || 5;

  // Check slot capacity (only paid bookings count)
  const { data: slotBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("time_slot", timeSlot)
    .eq("payment_status", "paid");
  const slotUsed = (slotBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (slotUsed + people > slotCap) {
    return NextResponse.json({
      error: `Only ${Math.max(0, slotCap - slotUsed)} spot(s) left in that slot. Please choose another time.`,
    }, { status: 409 });
  }

  // Check daily cap (only paid bookings count)
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("payment_status", "paid");
  const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (dailyUsed + people > maxDaily) {
    return NextResponse.json({
      error: `This date is fully booked. Please choose another date.`,
    }, { status: 409 });
  }

  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const mode = await getStripeModeAsync();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: isParty ? "party" : "booking",
        stripeMode: mode,
        name,
        email,
        date,
        timeSlot,
        people: String(people),
        totalPrice: String(totalPrice),
        phone: body.phone || "",
      },
      receipt_email: email,
      description: isParty
        ? `Birthday Party Booking — ${people} children`
        : `Slime Studio Session — ${people} ${people === 1 ? "person" : "people"} — ${date} at ${timeSlot}`,
    });

    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Payment intent error:", msg);
    return NextResponse.json({ error: `Failed to create payment intent: ${msg}` }, { status: 500 });
  }
}
