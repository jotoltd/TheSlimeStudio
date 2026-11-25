import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Public, aggregate-only booking availability for a date. Replaces the
// booking page's direct reads of the bookings table (which contains customer
// PII and will no longer be anon-readable).
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("time_slot, people, is_party, stripe_session_id, notes")
    .eq("date", date)
    .eq("payment_status", "paid");

  if (error) return NextResponse.json({ error: "Could not load availability" }, { status: 500 });

  const slotUsed: Record<string, number> = {};
  let dailyUsed = 0;
  for (const b of data || []) {
    slotUsed[b.time_slot] = (slotUsed[b.time_slot] || 0) + b.people;
    const isPlaceholder = b.stripe_session_id?.endsWith("_slot2") || b.notes?.startsWith("[Blocked for 2-hour");
    if (!b.is_party && !isPlaceholder) dailyUsed += b.people;
  }

  return NextResponse.json({ slotUsed, dailyUsed });
}
