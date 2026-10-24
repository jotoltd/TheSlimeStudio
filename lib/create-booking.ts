import { supabaseAdmin, STAMPS_PER_REWARD } from "@/lib/supabase";
import { generateRewardCode, redeemRewardCode } from "@/lib/loyalty-rewards";
import { withGclidTag, uploadClickConversion, sanitizeAdSource } from "@/lib/google-ads";
import {
  getResend,
  EMAIL_FROM,
  CONTACT_EMAIL,
  logEmail,
  bookingConfirmationHtml,
  adSourceLabel,
  emailEnabled,
  emailTemplates,
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
  adSource?: string | null;
  gclid?: string | null;
};

export type CreateBookingResult = {
  created: boolean;
  bookingId: string | null;
  overCapacity: boolean;
  error?: string;
};

// Pending checkouts older than this can never complete — Stripe checkout
// sessions die at 24h and SumUp hosted-checkout redirects are one-shot.
const ABANDONED_CHECKOUT_MS = 24 * 3600 * 1000;

// Sweeps abandoned regular bookings. Called from admin routes that are hit
// regularly (e.g. the notifications poll) since there's no cron in this app.
export async function expireStalePendingBookings() {
  const cutoff = new Date(Date.now() - ABANDONED_CHECKOUT_MS).toISOString();
  await supabaseAdmin
    .from("bookings")
    .update({ payment_status: "expired" })
    .eq("payment_status", "pending")
    .lt("created_at", cutoff);
}

export async function expireStalePendingEventBookings() {
  const cutoff = new Date(Date.now() - ABANDONED_CHECKOUT_MS).toISOString();
  await supabaseAdmin
    .from("special_event_bookings")
    .update({ payment_status: "expired" })
    .eq("payment_status", "pending")
    .lt("created_at", cutoff);
}

export async function expireStalePendingGiftCards() {
  const cutoff = new Date(Date.now() - ABANDONED_CHECKOUT_MS).toISOString();
  await supabaseAdmin
    .from("gift_cards")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("created_at", cutoff);
}

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
    people, totalPrice, isParty, discountCode, adSource, gclid,
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
      notes: withGclidTag(sanitizeAdSource(adSource), gclid),
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
  // One stamp per slime maker paid for — a booking for 3 earns 3 stamps.
  await awardLoyaltyStamp(name, email, people).catch(() => {});

  if (discountCode && discountCode.toUpperCase().startsWith("FREE-")) {
    await redeemRewardCode(discountCode, email).catch(() => {});
  }
  if (discountCode) {
    await awardReferrerReward(discountCode).catch(() => {});
  }

  // Google Ads offline conversion — orderId matches the browser tag's
  // transaction_id so the pair dedupes if both delivered.
  if (gclid) {
    await uploadClickConversion({ gclid, value: totalPrice, orderId: paymentRef }).catch(() => {});
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
    const slotCap = settings?.slot_capacity || 10;
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

// Referral codes are discount codes linked to a customer — each confirmed
// use earns the referrer the configured reward (currently always a loyalty
// stamp). Call once per confirmed paid booking/order that used the code.
export async function awardReferrerReward(discountCode: string) {
  // Referrals switch (Settings → Loyalty) — when off, codes already issued
  // still work as plain discounts but no referrer reward is awarded.
  const { data: siteSettings } = await supabaseAdmin
    .from("site_settings").select("referrals_enabled").eq("id", 1).single();
  if (siteSettings && siteSettings.referrals_enabled === false) return;

  const { data: code } = await supabaseAdmin
    .from("discount_codes")
    .select("id, referrer_customer_id, referrer_reward")
    .eq("code", discountCode.trim().toUpperCase())
    .maybeSingle();
  if (!code?.referrer_customer_id || code.referrer_reward !== "loyalty_stamp") return;

  const { data: referrer } = await supabaseAdmin
    .from("customers")
    .select("email, name")
    .eq("id", code.referrer_customer_id)
    .maybeSingle();
  if (!referrer?.email) return;

  await awardLoyaltyStamp(referrer.name || "Customer", referrer.email);
}

export async function sendCustomerConfirmation(d: BookingDetails) {
  const r = getResend();
  if (!r || !(await emailEnabled("booking_confirmation"))) return;
  const ov = await emailTemplates();
  await r.emails.send({
    from: EMAIL_FROM,
    to: d.email,
    subject: ov.email_tpl_booking_subject || "Your Slime Studio booking is confirmed!",
    html: bookingConfirmationHtml({
      name: d.name,
      date: d.date,
      timeSlot: d.timeSlot,
      people: d.people,
      totalPrice: Number(d.totalPrice),
      isParty: d.isParty,
    }, ov),
  });
  await logEmail(d.email, "Booking Confirmation", "booking_confirmation", "sent");
}

export async function sendAdminNotification(d: BookingDetails, overCapacity: boolean) {
  const r = getResend();
  if (!r || !(await emailEnabled("admin_notification"))) return;
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
      ${d.adSource ? `<p style="color:#1877f2"><strong>📣 Source:</strong> ${adSourceLabel(d.adSource)}</p>` : ""}
      <p style="color:#888;font-size:0.85em"><strong>Received:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
    `,
  });
  await logEmail(CONTACT_EMAIL, `New Booking — ${d.name}`, "admin_notification", "sent");
}

export async function awardLoyaltyStamp(name: string, email: string, count = 1) {
  if (count < 1) return;

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
    const rewards = Math.floor(count / stampsPerReward);
    const { data: card } = await supabaseAdmin
      .from("loyalty_cards")
      .insert({
        email: email.toLowerCase(),
        name,
        stamps: count % stampsPerReward,
        total_stamps: count,
        rewards_earned: rewards,
        rewards_redeemed: 0,
      })
      .select("id")
      .single();
    if (rewards > 0 && card) {
      await generateRewardCode(card.id, email, name);
    }
    return;
  }

  const newTotal = existingCard.stamps + count;
  const earnedRewards = Math.floor(newTotal / stampsPerReward);
  const stampCount = newTotal % stampsPerReward;

  await supabaseAdmin
    .from("loyalty_cards")
    .update({
      stamps: stampCount,
      total_stamps: existingCard.total_stamps + count,
      rewards_earned: existingCard.rewards_earned + earnedRewards,
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingCard.id);

  if (earnedRewards > 0 && !existingCard.reward_code) {
    await generateRewardCode(existingCard.id, email, name);
  }
}
