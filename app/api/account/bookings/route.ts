import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, date, time_slot, people, total_price, name, email, phone, is_party, payment_status, attendance_status, notes, created_at")
    .eq("email", session.email)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to fetch customer bookings:", error);
    return NextResponse.json({ error: "Could not load bookings" }, { status: 500 });
  }

  return NextResponse.json({ bookings: bookings || [] });
}
