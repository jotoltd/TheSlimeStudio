import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET — public, returns weekly schedule + date overrides
export async function GET() {
  const { data: weekly, error: weeklyErr } = await supabaseAdmin
    .from("opening_hours")
    .select("*")
    .order("day_of_week", { ascending: true });

  const { data: overrides, error: overridesErr } = await supabaseAdmin
    .from("date_overrides")
    .select("*")
    .order("date", { ascending: true });

  if (weeklyErr) console.error("opening_hours GET weekly error:", weeklyErr);
  if (overridesErr) console.error("opening_hours GET overrides error:", overridesErr);

  return NextResponse.json({
    weekly: weekly || [],
    overrides: overrides || [],
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
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

    // Delete existing and re-insert using upsert for reliability
    for (const s of schedule) {
      const { error } = await supabaseAdmin
        .from("opening_hours")
        .upsert({
          day_of_week: s.day_of_week,
          is_open: s.is_open,
          time_slots: s.time_slots,
        }, { onConflict: "day_of_week" });
      if (error) {
        console.error("opening_hours save error for day", s.day_of_week, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    // Delete any days that are no longer in the schedule (0-6 not in schedule)
    const savedDays = schedule.map((s) => s.day_of_week);
    for (let dow = 0; dow <= 6; dow++) {
      if (!savedDays.includes(dow)) {
        await supabaseAdmin.from("opening_hours").delete().eq("day_of_week", dow);
      }
    }
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "no-store" },
    });
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
