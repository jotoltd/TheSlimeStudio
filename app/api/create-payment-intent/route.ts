import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync, getStripeModeAsync } from "@/lib/stripe";
import { supabaseAdmin, STAMPS_PER_REWARD } from "@/lib/supabase";
import { generateRewardCode, redeemRewardCode } from "@/lib/loyalty-rewards";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, date, timeSlot, people, totalPrice, isParty, discountCode } = body as {
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    isParty?: boolean;
    discountCode?: string;
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
      })
      .select("id")
      .single();

    if (bookingError) {
      return NextResponse.json({ error: "Failed to create booking: " + bookingError.message }, { status: 500 });
    }

    // Send confirmation email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/booking-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, date, timeSlot, people, totalPrice: 0, isParty: false }),
      });
    } catch {}

    // Award loyalty stamp (if loyalty programme is enabled)
    try {
      const { data: siteSettings } = await supabaseAdmin
        .from("site_settings")
        .select("loyalty_enabled, stamps_per_reward")
        .eq("id", 1)
        .single();

      if (siteSettings?.loyalty_enabled) {
        const stampsPerReward = siteSettings.stamps_per_reward || STAMPS_PER_REWARD;
        const { data: existingCard } = await supabaseAdmin
          .from("loyalty_cards")
          .select("id, stamps, total_stamps, rewards_earned, reward_code")
          .eq("email", email.toLowerCase())
          .single();

        if (existingCard) {
          const newStamps = existingCard.stamps + 1;
          const newTotal = existingCard.total_stamps + 1;
          let newRewards = existingCard.rewards_earned;
          let stampCount = newStamps;
          let earnedNewReward = false;

          if (newStamps >= stampsPerReward) {
            newRewards += 1;
            stampCount = newStamps - stampsPerReward;
            earnedNewReward = true;
          }

          await supabaseAdmin
            .from("loyalty_cards")
            .update({
              stamps: stampCount,
              total_stamps: newTotal,
              rewards_earned: newRewards,
              name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCard.id);

          if (earnedNewReward && !existingCard.reward_code) {
            await generateRewardCode(existingCard.id, email, name);
          }
        } else {
          await supabaseAdmin.from("loyalty_cards").insert({
            email: email.toLowerCase(),
            name,
            stamps: 1,
            total_stamps: 1,
            rewards_earned: 0,
            rewards_redeemed: 0,
          });
        }
      }
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
