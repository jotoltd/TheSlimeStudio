import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  // Only delete if not paid — safety check
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("payment_status")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ success: true });
  }

  if (booking.payment_status === "paid") {
    return NextResponse.json({ error: "Cannot delete a paid booking" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
