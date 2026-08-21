import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET — public, returns weekly schedule + date overrides
export async function GET() {
  const { data: weekly } = await supabaseAdmin
    .from("opening_hours")
    .select("*")
    .order("day_of_week", { ascending: true });

  const { data: overrides } = await supabaseAdmin
    .from("date_overrides")
    .select("*")
    .order("date", { ascending: true });

  return NextResponse.json({
    weekly: weekly || [],
    overrides: overrides || [],
  });
}

// POST — admin only, saves weekly schedule and/or date overrides
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "save_weekly") {
    const { schedule } = body as { schedule: { day_of_week: number; is_open: boolean; time_slots: string[] }[] };

    // Delete existing and re-insert
    await supabaseAdmin.from("opening_hours").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (schedule.length > 0) {
      const { error } = await supabaseAdmin.from("opening_hours").insert(
        schedule.map((s) => ({
          day_of_week: s.day_of_week,
          is_open: s.is_open,
          time_slots: s.time_slots,
        }))
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "add_override") {
    const { date, is_open, time_slots, label } = body as {
      date: string;
      is_open: boolean;
      time_slots: string[];
      label?: string;
    };

    // Upsert — if override for this date exists, update it
    const { error } = await supabaseAdmin
      .from("date_overrides")
      .upsert({ date, is_open, time_slots, label: label || null }, { onConflict: "date" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "remove_override") {
    const { date } = body as { date: string };
    const { error } = await supabaseAdmin.from("date_overrides").delete().eq("date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
