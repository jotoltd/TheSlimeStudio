import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getResend,
  EMAIL_FROM,
  bookingConfirmationHtml,
  emailEnabled,
  emailTemplates,
  logEmail,
} from "@/lib/email";

export const runtime = "nodejs";

// POST /api/reschedule-booking — admin moves a booking to a new date/slot.
// Mirrors the checks in /api/account/reschedule: destination must be in the
// future and have room (slot + daily capacity), excluding the booking itself.
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, newDate, newTimeSlot, people, notify } = await req.json();
  if (!bookingId || !newDate || !newTimeSlot) {
    return NextResponse.json({ error: "Missing bookingId, newDate or newTimeSlot" }, { status: 400 });
  }

  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const newPeople = Number(people) > 0 ? Math.floor(Number(people)) : booking.people;

  if (booking.date === newDate && booking.time_slot === newTimeSlot) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // Don't move a booking into the past
  const target = new Date(newDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(target.getTime()) || target < today) {
    return NextResponse.json({ error: "New date cannot be in the past" }, { status: 400 });
  }
  if (newDate === new Date().toISOString().slice(0, 10)) {
    const slotHour = parseInt(newTimeSlot.split(":")[0]);
    if (new Date().getHours() >= slotHour) {
      return NextResponse.json({ error: "That time slot has already passed today" }, { status: 400 });
    }
  }

  const { data: settings } = await supabaseAdmin.from("booking_settings").select("*").eq("id", 1).single();
  const slotCap = settings?.slot_capacity || 10;
  const dailyCap = settings?.max_daily_bookings || 50;

  const { data: sameSlot } = await supabaseAdmin
    .from("bookings").select("people")
    .eq("date", newDate).eq("time_slot", newTimeSlot).eq("payment_status", "paid")
    .neq("id", bookingId);
  const slotUsed = (sameSlot || []).reduce((s, b) => s + b.people, 0);

  // Daily cap follows the public checkout rule: only real, non-party attendees
  // count — `_slot2` rows are auto-blocked second hours, not extra people.
  const { data: sameDay } = await supabaseAdmin
    .from("bookings").select("people")
    .eq("date", newDate).eq("payment_status", "paid").eq("is_party", false)
    .not("stripe_session_id", "like", "%_slot2")
    .neq("id", bookingId);
  const dayUsed = (sameDay || []).reduce((s, b) => s + b.people, 0);

  if (!booking.is_party && slotUsed + newPeople > slotCap) {
    return NextResponse.json(
      { error: `Not enough space in that slot — ${slotCap - slotUsed} spot(s) left` },
      { status: 409 }
    );
  }
  if (!booking.is_party && dayUsed + newPeople > dailyCap) {
    return NextResponse.json(
      { error: `Daily capacity reached — ${dailyCap - dayUsed} spot(s) left on that date` },
      { status: 409 }
    );
  }

  const { error: updErr } = await supabaseAdmin
    .from("bookings").update({ date: newDate, time_slot: newTimeSlot }).eq("id", bookingId);
  if (updErr) {
    return NextResponse.json({ error: "Failed to reschedule" }, { status: 500 });
  }

  let emailed = false;
  if (notify && booking.email && (await emailEnabled("booking_confirmation"))) {
    try {
      const r = getResend();
      if (r) {
        const ov = await emailTemplates();
        const subject = `Booking Moved to ${new Date(newDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} — The Slime Studio`;
        await r.emails.send({
          from: EMAIL_FROM,
          to: booking.email,
          subject,
          html: bookingConfirmationHtml({
            name: booking.name, date: newDate, timeSlot: newTimeSlot,
            people: newPeople, totalPrice: Number(booking.total_price || 0),
            isParty: booking.is_party,
          }, { ...ov, email_tpl_booking_heading: "Your booking has been moved" }),
        });
        emailed = true;
        await logEmail(booking.email, subject, "booking_confirmation", "sent");
      }
    } catch (e) {
      console.error("Reschedule email failed:", e);
      await logEmail(booking.email, "Booking moved — The Slime Studio", "booking_confirmation", "failed");
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
