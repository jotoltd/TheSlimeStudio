import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET — list upcoming events with instances (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const today = new Date().toISOString().split("T")[0];

  let eventQuery = supabaseAdmin
    .from("special_events")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category) {
    eventQuery = eventQuery.eq("category", category);
  }

  const { data: events, error } = await eventQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch upcoming instances for these events
  const eventIds = (events || []).map((e: any) => e.id);
  let instancesMap: Record<string, any[]> = {};

  if (eventIds.length > 0) {
    const { data: instances } = await supabaseAdmin
      .from("special_event_instances")
      .select("*")
      .in("event_id", eventIds)
      .gte("date", today)
      .eq("status", "open")
      .order("date", { ascending: true });

    (instances || []).forEach((inst: any) => {
      if (!instancesMap[inst.event_id]) instancesMap[inst.event_id] = [];
      instancesMap[inst.event_id].push(inst);
    });

    // Fetch booking counts
    const instanceIds = (instances || []).map((i: any) => i.id);
    let bookingCounts: Record<string, number> = {};
    if (instanceIds.length > 0) {
      const { data: bookings } = await supabaseAdmin
        .from("special_event_bookings")
        .select("instance_id, quantity")
        .in("instance_id", instanceIds)
        .eq("payment_status", "paid");
      (bookings || []).forEach((b: any) => {
        bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] || 0) + b.quantity;
      });
    }

    Object.values(instancesMap).flat().forEach((inst: any) => {
      inst.booked_count = bookingCounts[inst.id] || 0;
      inst.spots_remaining = (inst.capacity || 0) - (inst.booked_count || 0);
    });
  }

  // Only return events that have upcoming instances
  const eventsWithInstances = (events || [])
    .filter((e: any) => instancesMap[e.id] && instancesMap[e.id].length > 0)
    .map((e: any) => ({
      ...e,
      instances: instancesMap[e.id] || [],
    }));

  return NextResponse.json({ events: eventsWithInstances });
}
