import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { bookingId, status } = await req.json();

  if (!bookingId || !status) {
    return NextResponse.json({ error: "Missing bookingId or status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ payment_status: status })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
