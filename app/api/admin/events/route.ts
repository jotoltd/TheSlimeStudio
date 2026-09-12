import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET — list all events with their instances (admin)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includePast = searchParams.get("past") === "true";

  const { data: events, error } = await supabaseAdmin
    .from("special_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch instances for each event
  const eventIds = (events || []).map((e: any) => e.id);
  let instancesMap: Record<string, any[]> = {};

  if (eventIds.length > 0) {
    let instanceQuery = supabaseAdmin
      .from("special_event_instances")
      .select("*")
      .in("event_id", eventIds)
      .order("date", { ascending: true });

    if (!includePast) {
      const today = new Date().toISOString().split("T")[0];
      instanceQuery = instanceQuery.gte("date", today);
    }

    const { data: instances, error: instError } = await instanceQuery;
    if (instError) return NextResponse.json({ error: instError.message }, { status: 500 });

    (instances || []).forEach((inst: any) => {
      if (!instancesMap[inst.event_id]) instancesMap[inst.event_id] = [];
      instancesMap[inst.event_id].push(inst);
    });

    // Fetch booking counts for each instance
    const instanceIds = (instances || []).map((i: any) => i.id);
    let bookingCounts: Record<string, number> = {};
    if (instanceIds.length > 0) {
      const { data: bookings } = await supabaseAdmin
        .from("special_event_bookings")
        .select("instance_id, quantity, payment_status")
        .in("instance_id", instanceIds)
        .eq("payment_status", "paid");
      (bookings || []).forEach((b: any) => {
        bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] || 0) + b.quantity;
      });
    }

    // Add booking count to each instance
    Object.values(instancesMap).flat().forEach((inst: any) => {
      inst.booked_count = bookingCounts[inst.id] || 0;
    });
  }

  const eventsWithInstances = (events || []).map((e: any) => ({
    ...e,
    instances: instancesMap[e.id] || [],
  }));

  return NextResponse.json({ events: eventsWithInstances });
}

// POST — create, update, or delete event
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // Generate a URL-friendly slug from a title
  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Ensure slug is unique
  async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base || "event";
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = supabaseAdmin.from("special_events").select("id").eq("slug", slug);
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query.maybeSingle();
      if (!data) return slug;
      slug = `${base}-${suffix++}`;
    }
  }

  if (action === "create") {
    const { event, instances } = body as {
      event: {
        title: string;
        description: string;
        event_type: string;
        category: string;
        pricing_model: string;
        price: number;
        capacity: number;
        duration_minutes: number;
        image_url?: string;
        is_active: boolean;
        slug?: string;
      };
      instances: { date: string; start_time: string; capacity?: number }[];
    };

    const slug = await uniqueSlug(event.slug?.trim() || generateSlug(event.title));

    const { data: newEvent, error: createError } = await supabaseAdmin
      .from("special_events")
      .insert({
        ...event,
        slug,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

    if (instances && instances.length > 0 && newEvent) {
      const instanceRows = instances.map((inst) => ({
        event_id: newEvent.id,
        date: inst.date,
        start_time: inst.start_time,
        capacity: inst.capacity || event.capacity,
      }));
      const { error: instError } = await supabaseAdmin
        .from("special_event_instances")
        .insert(instanceRows);
      if (instError) return NextResponse.json({ error: instError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: newEvent });
  }

  if (action === "update") {
    const { id, event, newInstances } = body as {
      id: string;
      event: Record<string, any>;
      newInstances?: { date: string; start_time: string; capacity?: number }[];
    };

    // If title changed and no explicit slug provided, regenerate slug
    let updateData = { ...event };
    if (event.title && !event.slug) {
      const newSlug = await uniqueSlug(generateSlug(event.title), id);
      updateData.slug = newSlug;
    }
    if (event.slug) {
      updateData.slug = await uniqueSlug(
        event.slug.trim() || generateSlug(event.title || "event"),
        id
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("special_events")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (newInstances && newInstances.length > 0) {
      const instanceRows = newInstances.map((inst) => ({
        event_id: id,
        date: inst.date,
        start_time: inst.start_time,
        capacity: inst.capacity || event.capacity,
      }));
      const { error: instError } = await supabaseAdmin
        .from("special_event_instances")
        .insert(instanceRows);
      if (instError) return NextResponse.json({ error: instError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    const { id } = body as { id: string };
    const { error } = await supabaseAdmin.from("special_events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete_instance") {
    const { id } = body as { id: string };
    const { error } = await supabaseAdmin.from("special_event_instances").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "cancel_instance") {
    const { id } = body as { id: string };
    const { error } = await supabaseAdmin
      .from("special_event_instances")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "generate_recurring") {
    // Generate instances for a recurring event
    const { event_id, start_date, end_date, days_of_week, start_time, capacity } = body as {
      event_id: string;
      start_date: string;
      end_date: string;
      days_of_week: number[];
      start_time: string;
      capacity?: number;
    };

    const start = new Date(start_date + "T00:00:00");
    const end = new Date(end_date + "T00:00:00");
    const rows: any[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      if (days_of_week.includes(cursor.getDay())) {
        rows.push({
          event_id,
          date: cursor.toISOString().split("T")[0],
          start_time,
          capacity: capacity || null,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No matching dates in range" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("special_event_instances").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: rows.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
