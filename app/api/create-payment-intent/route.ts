import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { redeemRewardCode } from "@/lib/loyalty-rewards";
import { awardLoyaltyStamp } from "@/lib/create-booking";
import { sendCapiEvent, metaContextFromRequest } from "@/lib/capi";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, date, timeSlot, people, totalPrice, isParty, discountCode, giftCardCode } = body as {
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    isParty?: boolean;
    discountCode?: string;
    giftCardCode?: string;
  };

  if (!name || !email || totalPrice == null || !date || !timeSlot) {
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
    return NextResponse.json({ error: "We're closed on this date. Please choose another day." }, { status: 400 });
  }
  if (allowedSlots && allowedSlots.length > 0 && !allowedSlots.includes(timeSlot)) {
    return NextResponse.json({ error: "This time slot is not available on the selected date." }, { status: 400 });
  }

  // Server-side capacity check before creating payment intent
  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("slot_capacity, max_daily_bookings")
    .eq("id", 1)
    .single();
  const slotCap = settings?.slot_capacity || 10;
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

  // Check daily cap (only paid, non-party bookings count)
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("payment_status", "paid")
    .eq("is_party", false);
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

  // Free booking after discount — create booking directly, no payment needed
  if (totalPrice === 0) {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        name,
        email,
        phone: body.phone || null,
        date,
        time_slot: timeSlot,
        people,
        total_price: 0,
        payment_status: "paid",
        stripe_session_id: `free_${Date.now()}`,
        is_party: false,
        discount_code: discountCode || null,
        notes: body.adSource || null,
      })
      .select("id")
      .single();

    if (bookingError) {
      return NextResponse.json({ error: "Failed to create booking: " + bookingError.message }, { status: 500 });
    }

    const meta = metaContextFromRequest(req, body);
    await sendCapiEvent({
      eventName: "Purchase",
      eventId: booking?.id || `free_${Date.now()}`,
      email, name, phone: body.phone,
      value: 0,
      sourceUrl: "https://theslimestudio.co.uk/booking",
      ...meta,
    });

    // Send confirmation email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/booking-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, date, timeSlot, people, totalPrice: 0, isParty: false }),
      });
    } catch {}

    // If a gift card covered the whole price, redeem it now.
    if (giftCardCode && booking?.id) {
      try {
        const { data: giftCard } = await supabaseAdmin
          .from("gift_cards")
          .select("balance")
          .eq("code", giftCardCode.trim().toUpperCase())
          .single();

        if (giftCard && giftCard.balance > 0) {
          const cover = Number(body.giftCardAmount) > 0 ? Number(body.giftCardAmount) : giftCard.balance;
          const redeemAmount = Math.min(giftCard.balance, cover);
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/gift-card-redeem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: giftCardCode.trim().toUpperCase(),
              amount: redeemAmount,
              bookingId: booking.id,
            }),
          });
        }
      } catch (e) {
        console.error("Failed to redeem gift card:", e);
      }
    }

    // Loyalty: gift card bookings earn a stamp per slime maker, other free
    // bookings earn one.
    try {
      await awardLoyaltyStamp(name, email, giftCardCode ? people : 1);
    } catch (e) {
      console.error("Failed to award loyalty stamp:", e);
    }

    // Redeem loyalty reward if a FREE- code was used
    if (discountCode && discountCode.toUpperCase().startsWith("FREE-")) {
      await redeemRewardCode(discountCode, email);
    }

    // Mark discount code as used
    if (discountCode) {
      try {
        const { data: disc } = await supabaseAdmin
          .from("discount_codes")
          .select("id, used_count")
          .eq("code", discountCode)
          .single();
        if (disc) {
          await supabaseAdmin
            .from("discount_codes")
            .update({ used_count: (disc.used_count || 0) + 1 })
            .eq("id", disc.id);
        }
      } catch (e) {
        console.error("Failed to increment discount usage:", e);
      }
    }

    return NextResponse.json({ free: true, bookingId: booking?.id });
  }

  const meta = metaContextFromRequest(req, body);

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
        discountCode: discountCode || "",
        giftCardCode: giftCardCode || "",
        giftCardAmount: String(Number(body.giftCardAmount) || ""),
        adSource: body.adSource || "",
        // Meta click context — lets the Conversions API Purchase event match
        // back to the ad click even when the browser pixel was blocked.
        fbp: (body.fbp || "").slice(0, 400),
        fbc: (body.fbc || "").slice(0, 400),
        cip: (meta.clientIp || "").slice(0, 100),
        cua: (meta.userAgent || "").slice(0, 400),
      },
      receipt_email: email,
      description: isParty
        ? `Birthday Party Booking — ${people} children`
        : `Slime Studio Session — ${people} ${people === 1 ? "person" : "people"} — ${date} at ${timeSlot}`,
    });

    await sendCapiEvent({
      eventName: "InitiateCheckout",
      eventId: intent.id,
      email, name, phone: body.phone,
      value: totalPrice,
      sourceUrl: "https://theslimestudio.co.uk/booking",
      ...meta,
    });

    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Payment intent error:", msg);
    return NextResponse.json({ error: `Failed to create payment intent: ${msg}` }, { status: 500 });
  }
}
