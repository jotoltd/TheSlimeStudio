import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { nextHourSlotWithDate } from "@/lib/time-slots";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, time_slot, people, name, email: rawEmail, phone, is_party, notes, total_price, duration } = await req.json();
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!date || !time_slot || !name) {
    return NextResponse.json({ error: "Date, time slot and name are required" }, { status: 400 });
  }

  // Admins may book any time (including out-of-hours), but it must be a valid HH:MM slot.
  const slot = String(time_slot).trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot)) {
    return NextResponse.json({ error: "Invalid time slot — use 24-hour HH:MM format (e.g. 18:30)" }, { status: 400 });
  }

  const bookingDuration = duration === 2 ? 2 : 1;

  const numPeople = parseInt(people, 10) || 1;

  // Get booking settings for capacity limits
  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("slot_capacity, max_daily_bookings")
    .eq("id", 1)
    .single();

  const slotCap = settings?.slot_capacity || 10;
  const maxDaily = settings?.max_daily_bookings || 60;

  // Check slot capacity (only paid bookings count) — but allow override for party bookings
  const { data: slotBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("time_slot", slot)
    .eq("payment_status", "paid");

  const slotUsed = (slotBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  const slotRemaining = slotCap - slotUsed;

  if (!is_party && numPeople > slotRemaining) {
    return NextResponse.json({
      error: `Only ${slotRemaining} spot${slotRemaining === 1 ? "" : "s"} left at ${slot} on ${date}. Cannot add ${numPeople} people.`,
    }, { status: 409 });
  }

  // Check daily cap — matches the public checkout rule: only paid, non-party
  // bookings count (a party is private hire, not part of the public quota),
  // and `_slot2` rows are the auto-blocked second hour of a 2-hour booking,
  // not extra people. Party bookings may override the cap.
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("payment_status", "paid")
    .eq("is_party", false)
    .not("stripe_session_id", "like", "%_slot2");

  const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  const dailyRemaining = maxDaily - dailyUsed;

  if (!is_party && numPeople > dailyRemaining) {
    return NextResponse.json({
      error: `Daily capacity reached. Only ${dailyRemaining} spot${dailyRemaining === 1 ? "" : "s"} left for ${date}.`,
    }, { status: 409 });
  }

  // Insert the booking
  const sessionId = `manual_${Date.now()}`;
  const { data, error } = await supabaseAdmin.from("bookings").insert({
    date,
    time_slot: slot,
    people: numPeople,
    total_price: total_price || 0,
    name,
    email: email || "",
    phone: phone || null,
    is_party: is_party || false,
    payment_status: "paid",
    notes: notes || null,
    stripe_session_id: sessionId,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: "Failed to add booking: " + error.message }, { status: 500 });
  }

  // If 2-hour duration, create a second booking to block the following hour.
  // The second slot preserves minutes and may land on the next calendar day
  // for 23:xx starts. Its capacity is checked like any other slot.
  if (bookingDuration === 2) {
    const second = nextHourSlotWithDate(date, slot);
    if (!second) {
      return NextResponse.json({
        success: true,
        bookingId: data.id,
        slotRemaining: slotRemaining - numPeople,
        warning: `Primary booking created at ${slot}, but could not compute the second-hour slot.`,
      });
    }
    const { date: secondDate, slot: nextSlot } = second;

    if (!is_party) {
      const { data: secondSlotBookings } = await supabaseAdmin
        .from("bookings")
        .select("people")
        .eq("date", secondDate)
        .eq("time_slot", nextSlot)
        .eq("payment_status", "paid");
      const secondUsed = (secondSlotBookings || []).reduce((s: number, b: { people: number }) => s + b.people, 0);
      if (secondUsed + numPeople > slotCap) {
        return NextResponse.json({
          success: true,
          bookingId: data.id,
          slotRemaining: slotRemaining - numPeople,
          warning: `Primary booking created at ${slot}, but ${nextSlot} on ${secondDate} only has ${slotCap - secondUsed} spot(s) left — second hour not blocked.`,
        });
      }
    }

    const { error: err2 } = await supabaseAdmin.from("bookings").insert({
      date: secondDate,
      time_slot: nextSlot,
      people: numPeople,
      total_price: 0,
      name,
      email: email || "",
      phone: phone || null,
      is_party: is_party || false,
      payment_status: "paid",
      notes: `[Blocked for 2-hour party — primary slot ${slot} on ${date}]${notes ? " " + notes : ""}`,
      stripe_session_id: `${sessionId}_slot2`,
    });

    if (err2) {
      return NextResponse.json({
        success: true,
        bookingId: data.id,
        slotRemaining: slotRemaining - numPeople,
        warning: `Primary booking created at ${slot}, but failed to block ${nextSlot}: ${err2.message}`,
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: data.id,
      slotRemaining: slotRemaining - numPeople,
      secondSlotBlocked: nextSlot,
    });
  }

  return NextResponse.json({ success: true, bookingId: data.id, slotRemaining: slotRemaining - numPeople });
}
