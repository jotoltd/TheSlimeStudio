import { NextRequest, NextResponse } from "next/server";
import { getSumUpKey, isSumUpConfigured } from "@/lib/payment";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, date, timeSlot, people, totalPrice, phone } = body as {
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    phone?: string;
  };

  if (!name || !email || !totalPrice || !date || !timeSlot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Don't allow booking in the past
  const [h, m] = timeSlot.split(":").map(Number);
  const slotTime = new Date(date + "T00:00:00");
  slotTime.setHours(h, m, 0, 0);
  if (slotTime.getTime() < Date.now()) {
    return NextResponse.json({ error: "Cannot book a session in the past." }, { status: 400 });
  }

  // Validate time slot against opening hours
  const { data: override } = await supabaseAdmin
    .from("date_overrides")
    .select("is_open, time_slots")
    .eq("date", date)
    .single();

  let allowedSlots: string[] | null = null;
  let isOpen = true;

  if (override) {
    isOpen = override.is_open;
    allowedSlots = override.time_slots;
  } else {
    const dow = new Date(date + "T00:00:00").getDay();
    const { data: weekly } = await supabaseAdmin
      .from("opening_hours")
      .select("is_open, time_slots")
      .eq("day_of_week", dow)
      .single();
    if (weekly) {
      isOpen = weekly.is_open;
      allowedSlots = weekly.time_slots;
    }
  }

  if (!isOpen) {
    return NextResponse.json({ error: "We're closed on this date." }, { status: 400 });
  }
  if (allowedSlots && allowedSlots.length > 0 && !allowedSlots.includes(timeSlot)) {
    return NextResponse.json({ error: "This time slot is not available." }, { status: 400 });
  }

  // Server-side capacity check
  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("slot_capacity, max_daily_bookings")
    .eq("id", 1)
    .single();
  const slotCap = settings?.slot_capacity || 5;
  const maxDaily = settings?.max_daily_bookings || 5;

  const { data: slotBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("time_slot", timeSlot)
    .eq("payment_status", "paid");
  const slotUsed = (slotBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (slotUsed + people > slotCap) {
    return NextResponse.json({ error: `Only ${Math.max(0, slotCap - slotUsed)} spot(s) left.` }, { status: 409 });
  }

  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("payment_status", "paid");
  const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (dailyUsed + people > maxDaily) {
    return NextResponse.json({ error: "This date is fully booked." }, { status: 409 });
  }

  if (!isSumUpConfigured()) {
    return NextResponse.json({ error: "SumUp is not configured" }, { status: 500 });
  }

  const key = getSumUpKey();
  const origin = req.nextUrl.origin;

  try {
    const checkoutRef = `SLM-BOOK-${Date.now().toString(36).toUpperCase()}`;

    const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(totalPrice.toFixed(2)),
        currency: "GBP",
        merchant_code: process.env.SUMUP_MERCHANT_ID || undefined,
        checkout_reference: checkoutRef,
        description: `Slime Studio Session — ${people} ${people === 1 ? "person" : "people"} — ${date} at ${timeSlot}`,
        redirect_url: `${origin}/booking?sumup_status=paid&ref=${checkoutRef}`,
        return_url: `${origin}/booking?sumup_status=paid&ref=${checkoutRef}`,
        hosted_checkout: {
          enabled: true,
          return_url: `${origin}/booking?sumup_status=paid&ref=${checkoutRef}`,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.id) {
      console.error("SumUp checkout error:", data);
      return NextResponse.json({ error: data.message || "Failed to create SumUp checkout" }, { status: 500 });
    }

    // Store booking as pending — confirmed after redirect
    const { data: booking } = await supabaseAdmin.from("bookings").insert({
      date,
      time_slot: timeSlot,
      people,
      total_price: totalPrice,
      name,
      email,
      phone: phone || null,
      is_party: false,
      payment_status: "pending",
      stripe_session_id: checkoutRef,
    }).select().single();

    const checkoutUrl = data.hosted_checkout?.url || data.checkout_url || data.url;
    if (!checkoutUrl) {
      console.error("SumUp checkout: no URL returned", data);
      return NextResponse.json({ error: "Failed to get checkout URL from SumUp" }, { status: 500 });
    }

    return NextResponse.json({
      url: checkoutUrl,
      checkoutId: data.id,
      checkoutRef,
      bookingId: booking?.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("SumUp booking checkout error:", msg);
    return NextResponse.json({ error: `Failed to create checkout: ${msg}` }, { status: 500 });
  }
}
