import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

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

  const { date, time_slot, people, name, email, phone, is_party, notes, total_price } = await req.json();

  if (!date || !time_slot || !name) {
    return NextResponse.json({ error: "Date, time slot and name are required" }, { status: 400 });
  }

  const numPeople = parseInt(people, 10) || 1;

  // Get booking settings for capacity limits
  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("slot_capacity, max_daily_bookings")
    .eq("id", 1)
    .single();

  const slotCap = settings?.slot_capacity || 10;
  const maxDaily = settings?.max_daily_bookings || 60;

  // Check slot capacity (exclude refunded bookings)
  const { data: slotBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .eq("time_slot", time_slot)
    .neq("payment_status", "refunded");

  const slotUsed = (slotBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  const slotRemaining = slotCap - slotUsed;

  if (numPeople > slotRemaining) {
    return NextResponse.json({
      error: `Only ${slotRemaining} spot${slotRemaining === 1 ? "" : "s"} left at ${time_slot} on ${date}. Cannot add ${numPeople} people.`,
    }, { status: 409 });
  }

  // Check daily cap (exclude refunded)
  const { data: dailyBookings } = await supabaseAdmin
    .from("bookings")
    .select("people")
    .eq("date", date)
    .neq("payment_status", "refunded");

  const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
  const dailyRemaining = maxDaily - dailyUsed;

  if (numPeople > dailyRemaining) {
    return NextResponse.json({
      error: `Daily capacity reached. Only ${dailyRemaining} spot${dailyRemaining === 1 ? "" : "s"} left for ${date}.`,
    }, { status: 409 });
  }

  // Insert the booking
  const { data, error } = await supabaseAdmin.from("bookings").insert({
    date,
    time_slot,
    people: numPeople,
    total_price: total_price || 0,
    name,
    email: email || null,
    phone: phone || null,
    is_party: is_party || false,
    payment_status: "paid",
    notes: notes || null,
    stripe_session_id: `manual_${Date.now()}`,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: "Failed to add booking: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, bookingId: data.id, slotRemaining: slotRemaining - numPeople });
}
