import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type EventRow = { id: string } & Record<string, unknown>;
type InstanceRow = {
  id: string;
  event_id: string;
  capacity: number | null;
  booked_count?: number;
  spots_remaining?: number;
} & Record<string, unknown>;

// GET — list upcoming events with instances (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const specificDate = searchParams.get("date");
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
  const eventIds = (events || []).map((e: EventRow) => e.id);
  const instancesMap: Record<string, InstanceRow[]> = {};

  if (eventIds.length > 0) {
    let instanceQuery = supabaseAdmin
      .from("special_event_instances")
      .select("*")
      .in("event_id", eventIds)
      .eq("status", "open");

    if (specificDate) {
      instanceQuery = instanceQuery.eq("date", specificDate);
    } else {
      instanceQuery = instanceQuery.gte("date", today);
    }
    instanceQuery = instanceQuery.order("date", { ascending: true });

    const { data: instances } = await instanceQuery;

    ((instances || []) as InstanceRow[]).forEach((inst) => {
      if (!instancesMap[inst.event_id]) instancesMap[inst.event_id] = [];
      instancesMap[inst.event_id].push(inst);
    });

    // Fetch booking counts
    const instanceIds = (instances || []).map((i: { id: string }) => i.id);
    const bookingCounts: Record<string, number> = {};
    if (instanceIds.length > 0) {
      const { data: bookings } = await supabaseAdmin
        .from("special_event_bookings")
        .select("instance_id, quantity")
        .in("instance_id", instanceIds)
        .eq("payment_status", "paid");
      (bookings || []).forEach((b: { instance_id: string; quantity: number }) => {
        bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] || 0) + b.quantity;
      });
    }

    Object.values(instancesMap).flat().forEach((inst) => {
      inst.booked_count = bookingCounts[inst.id] || 0;
      inst.spots_remaining = (inst.capacity || 0) - (inst.booked_count || 0);
    });
  }

  // Only return events that have instances (for the specific date, or upcoming)
  const eventsWithInstances = (events || [])
    .filter((e: EventRow) => instancesMap[e.id] && instancesMap[e.id].length > 0)
    .map((e: EventRow) => ({
      ...e,
      instances: instancesMap[e.id] || [],
    }));

  return NextResponse.json({ events: eventsWithInstances });
}
