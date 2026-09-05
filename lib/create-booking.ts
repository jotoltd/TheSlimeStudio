import { supabaseAdmin, STAMPS_PER_REWARD } from "@/lib/supabase";
import { generateRewardCode, redeemRewardCode } from "@/lib/loyalty-rewards";
import {
  getResend,
  EMAIL_FROM,
  CONTACT_EMAIL,
  logEmail,
  bookingConfirmationHtml,
} from "@/lib/email";

export type BookingDetails = {
  paymentRef: string;
  name: string;
  email: string;
  phone?: string | null;
  date: string;
  timeSlot: string;
  people: number;
  totalPrice: number;
  isParty?: boolean;
  discountCode?: string | null;
};

export type CreateBookingResult = {
  created: boolean;
  bookingId: string | null;
  overCapacity: boolean;
  error?: string;
};

/**
 * Creates a paid booking for a payment that has ALREADY been captured.
 *
 * Rules:
 *  - Idempotent: keyed on paymentRef (Stripe payment intent id / SumUp checkout ref).
 *    Safe to call from both the client confirm flow and the webhook fallback.
 *  - Never discards a paid booking. If the slot is over capacity we still record
 *    the booking and flag it in admin_notes, because the customer's money has
 *    already been taken. Silently dropping it is what caused customers to arrive
 *    with no booking on the system.
 */
export async function createPaidBooking(details: BookingDetails): Promise<CreateBookingResult> {
  const {
    paymentRef, name, email, phone, date, timeSlot,
    people, totalPrice, isParty, discountCode,
  } = details;

  // Idempotency: has this payment already produced a booking?
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", paymentRef)
    .limit(1);

  if (existing && existing.length > 0) {
    return { created: false, bookingId: existing[0].id, overCapacity: false };
  }

  // Capacity is informational only — we never refuse a booking that has been paid for.
  const overCapacity = await isOverCapacity(date, timeSlot, people);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      date,
      time_slot: timeSlot,
      people,
      total_price: totalPrice,
      name,
      email,
      phone: phone || null,
      is_party: isParty || false,
      payment_status: "paid",
      stripe_session_id: paymentRef,
      discount_code: discountCode || null,
      admin_notes: overCapacity
        ? "⚠️ OVER CAPACITY — payment was taken after the slot filled up. Review and contact the customer."
        : "",
    })
    .select("id")
    .single();

  if (error || !data) {
    // Unique index on stripe_session_id means a concurrent caller won the race.
    const { data: retry } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", paymentRef)
      .limit(1);
    if (retry && retry.length > 0) {
      return { created: false, bookingId: retry[0].id, overCapacity: false };
    }
    return {
      created: false,
      bookingId: null,
      overCapacity,
      error: error?.message || "Failed to create booking",
    };
  }

  // Best-effort side effects — never let these fail the booking.
  await sendCustomerConfirmation(details).catch(() => {});
  await sendAdminNotification(details, overCapacity).catch(() => {});
  await awardLoyaltyStamp(name, email).catch(() => {});

  if (discountCode && discountCode.toUpperCase().startsWith("FREE-")) {
    await redeemRewardCode(discountCode, email).catch(() => {});
  }

  return { created: true, bookingId: data.id, overCapacity };
}

async function isOverCapacity(date: string, timeSlot: string, people: number): Promise<boolean> {
  try {
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
    if (slotUsed + people > slotCap) return true;

    const { data: dailyBookings } = await supabaseAdmin
      .from("bookings")
      .select("people")
      .eq("date", date)
      .eq("payment_status", "paid");
    const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
    return dailyUsed + people > maxDaily;
  } catch {
    return false;
  }
}

export async function sendCustomerConfirmation(d: BookingDetails) {
  const r = getResend();
  if (!r) return;
  await r.emails.send({
    from: EMAIL_FROM,
    to: d.email,
    subject: "Your Slime Studio booking is confirmed!",
    html: bookingConfirmationHtml({
      name: d.name,
      date: d.date,
      timeSlot: d.timeSlot,
      people: d.people,
      totalPrice: Number(d.totalPrice),
      isParty: d.isParty,
    }),
  });
  await logEmail(d.email, "Booking Confirmation", "booking_confirmation", "sent");
}

export async function sendAdminNotification(d: BookingDetails, overCapacity: boolean) {
  const r = getResend();
  if (!r) return;
  await r.emails.send({
    from: EMAIL_FROM,
    to: CONTACT_EMAIL,
    subject: `${overCapacity ? "⚠️ OVER CAPACITY — " : ""}New Booking — ${d.name} on ${d.date} at ${d.timeSlot}`,
    html: `
      <h2>New Booking Received</h2>
      ${overCapacity ? "<p style=\"color:#c00\"><strong>This booking exceeds the slot/daily capacity.</strong> Payment was taken, so the booking has been recorded — please review it.</p>" : ""}
      <p><strong>Name:</strong> ${d.name}</p>
      <p><strong>Email:</strong> ${d.email}</p>
      <p><strong>Phone:</strong> ${d.phone || "Not provided"}</p>
      <p><strong>Date:</strong> ${d.date}</p>
      <p><strong>Time:</strong> ${d.timeSlot}</p>
      <p><strong>People:</strong> ${d.people}</p>
      <p><strong>Total:</strong> £${Number(d.totalPrice).toFixed(2)}</p>
      <p><strong>Payment:</strong> Paid</p>
    `,
  });
  await logEmail(CONTACT_EMAIL, `New Booking — ${d.name}`, "admin_notification", "sent");
}

export async function awardLoyaltyStamp(name: string, email: string) {
  const { data: siteSettings } = await supabaseAdmin
    .from("site_settings")
    .select("loyalty_enabled, stamps_per_reward")
    .eq("id", 1)
    .single();

  if (!siteSettings?.loyalty_enabled) return;

  const stampsPerReward = siteSettings.stamps_per_reward || STAMPS_PER_REWARD;
  const { data: existingCard } = await supabaseAdmin
    .from("loyalty_cards")
    .select("id, stamps, total_stamps, rewards_earned, reward_code")
    .eq("email", email.toLowerCase())
    .single();

  if (!existingCard) {
    await supabaseAdmin.from("loyalty_cards").insert({
      email: email.toLowerCase(),
      name,
      stamps: 1,
      total_stamps: 1,
      rewards_earned: 0,
      rewards_redeemed: 0,
    });
    return;
  }

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
}
