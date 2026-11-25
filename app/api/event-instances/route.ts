import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Public, aggregate-only event instance list for a date — replaces the
// booking page's direct reads of special_event_instances/bookings (the
// bookings table contains attendee PII and won't be anon-readable).
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { data: instances, error } = await supabaseAdmin
    .from("special_event_instances")
    .select("id, event_id, date, start_time, capacity, status, event:special_events(id, title, slug, category, image_url, price, pricing_model, duration_minutes, is_active)")
    .eq("date", date)
    .eq("status", "open");

  if (error) return NextResponse.json({ error: "Could not load events" }, { status: 500 });

  const ids = (instances || []).map((i: { id: string }) => i.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from("special_event_bookings")
      .select("instance_id, quantity")
      .in("instance_id", ids)
      .eq("payment_status", "paid");
    (bookings || []).forEach((b: { instance_id: string; quantity: number }) => {
      counts[b.instance_id] = (counts[b.instance_id] || 0) + b.quantity;
    });
  }

  const result = (instances || []).map((inst: Record<string, unknown> & { id: string }) => ({
    ...inst,
    booked_count: counts[inst.id] || 0,
  }));

  return NextResponse.json({ instances: result });
}
