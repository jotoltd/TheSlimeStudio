import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidDateString, isValidTimeSlot, nextHourSlotWithDate } from "@/lib/time-slots";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (rateLimited(`reschedule:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { bookingId, newDate, newTimeSlot } = await req.json() as {
    bookingId?: string;
    newDate?: string;
    newTimeSlot?: string;
  };

  if (!bookingId || !newDate || !newTimeSlot) {
    return NextResponse.json(
      { error: "Booking ID, new date, and new time slot are required." },
      { status: 400 }
    );
  }

  // Strict formats — a malformed slot makes the Date math NaN, which slips
  // past the past-date check below.
  if (!isValidDateString(newDate) || !isValidTimeSlot(newTimeSlot)) {
    return NextResponse.json({ error: "Invalid date or time slot." }, { status: 400 });
  }

  // Fetch the booking and verify it belongs to this customer
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from("bookings")
    .select("id, email, date, time_slot, people, is_party, payment_status, stripe_session_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (booking.email !== session.email) {
    return NextResponse.json({ error: "You can only reschedule your own bookings." }, { status: 403 });
  }

  // Only allow rescheduling paid, upcoming bookings
  if (booking.payment_status !== "paid") {
    return NextResponse.json({ error: "Only paid bookings can be rescheduled." }, { status: 400 });
  }

  // Local "today", not UTC — toISOString() is a day ahead for UK evenings.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (booking.date < todayStr) {
    return NextResponse.json({ error: "Past bookings cannot be rescheduled." }, { status: 400 });
  }

  // Don't allow rescheduling to a past date/slot, and only to slots the
  // studio actually offers that day (same rule as public checkout).
  const slotDateTime = new Date(newDate + "T00:00:00");
  const [h, m] = newTimeSlot.split(":").map(Number);
  slotDateTime.setHours(h, m, 0, 0);
  if (slotDateTime.getTime() < now.getTime()) {
    return NextResponse.json({ error: "Cannot reschedule to a past date or time." }, { status: 400 });
  }

  const { data: dateOverride } = await supabaseAdmin
    .from("date_overrides")
    .select("is_open, time_slots")
    .eq("date", newDate)
    .maybeSingle();
  let allowedSlots: string[] | null = null;
  let isOpen = true;
  if (dateOverride) {
    isOpen = dateOverride.is_open;
    allowedSlots = dateOverride.time_slots;
  } else {
    const dow = new Date(newDate + "T00:00:00").getDay();
    const { data: weekly } = await supabaseAdmin
      .from("opening_hours")
      .select("is_open, time_slots")
      .eq("day_of_week", dow)
      .maybeSingle();
    if (weekly) {
      isOpen = weekly.is_open;
      allowedSlots = weekly.time_slots;
    }
  }
  if (!isOpen) {
    return NextResponse.json({ error: "The studio is closed on that date." }, { status: 400 });
  }
  if (allowedSlots && allowedSlots.length > 0 && !allowedSlots.includes(newTimeSlot)) {
    return NextResponse.json({ error: "That time slot isn't available on the selected date." }, { status: 400 });
  }

  // If nothing changed, no-op
  if (booking.date === newDate && booking.time_slot === newTimeSlot) {
    return NextResponse.json({ ok: true, message: "No changes needed." });
  }

  // Check slot capacity at the new date/time (exclude this booking's own people since it's moving)
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
    .eq("date", newDate)
    .eq("time_slot", newTimeSlot)
    .eq("payment_status", "paid")
    .neq("id", bookingId);

  const slotUsed = (slotBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (!booking.is_party && slotUsed + booking.people > slotCap) {
    const remaining = Math.max(0, slotCap - slotUsed);
    return NextResponse.json(
      { error: `That slot only has ${remaining} spot${remaining === 1 ? "" : "s"} left. Please choose another time.` },
      { status: 409 }
    );
  }

  // Check daily cap at the new date — same rule as checkout: only paid,
  // non-party bookings count, and `_slot2` placeholder rows aren't people.
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", newDate)
    .eq("payment_status", "paid")
    .eq("is_party", false)
    .not("stripe_session_id", "like", "%_slot2")
    .neq("id", bookingId);

  const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  if (!booking.is_party && dailyUsed + booking.people > maxDaily) {
    return NextResponse.json(
      { error: "That date is fully booked. Please choose another date." },
      { status: 409 }
    );
  }

  // Update the booking
  const { error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update({ date: newDate, time_slot: newTimeSlot })
    .eq("id", bookingId);

  if (updateErr) {
    console.error("Reschedule failed:", updateErr);
    return NextResponse.json({ error: "Could not reschedule. Please try again." }, { status: 500 });
  }

  // A 2-hour booking's `_slot2` placeholder must move with it, otherwise it
  // keeps blocking the old slot and leaves the new second hour open. Handles
  // custom minutes and midnight wrap (23:30 → next day 00:30).
  if (booking.stripe_session_id) {
    const next = nextHourSlotWithDate(newDate, newTimeSlot);
    if (next) {
      await supabaseAdmin
        .from("bookings")
        .update({ date: next.date, time_slot: next.slot, notes: `[Blocked for 2-hour party — primary slot ${newTimeSlot}]` })
        .eq("stripe_session_id", `${booking.stripe_session_id}_slot2`);
    }
  }

  return NextResponse.json({ ok: true });
}
