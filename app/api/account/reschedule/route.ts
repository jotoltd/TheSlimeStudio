import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  // Fetch the booking and verify it belongs to this customer
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from("bookings")
    .select("id, email, date, time_slot, people, is_party, payment_status")
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

  const todayStr = new Date().toISOString().split("T")[0];
  if (booking.date < todayStr) {
    return NextResponse.json({ error: "Past bookings cannot be rescheduled." }, { status: 400 });
  }

  // Don't allow rescheduling to a past date/slot
  const now = new Date();
  const slotDateTime = new Date(newDate + "T00:00:00");
  const [h, m] = newTimeSlot.split(":").map(Number);
  slotDateTime.setHours(h, m, 0, 0);
  if (slotDateTime.getTime() < now.getTime()) {
    return NextResponse.json({ error: "Cannot reschedule to a past date or time." }, { status: 400 });
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

  const slotCap = settings?.slot_capacity || 5;
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

  // Check daily cap at the new date
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", newDate)
    .eq("payment_status", "paid")
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

  return NextResponse.json({ ok: true });
}
