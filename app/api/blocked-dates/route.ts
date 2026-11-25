import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

// GET — public callers (booking page) only need the dates. The admin
// `reason` is internal notes and is only returned to authenticated admins.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  const isAdmin = !!token && !!verifyToken(token);

  const { data, error } = await supabaseAdmin
    .from("blocked_dates")
    .select(isAdmin ? "date, reason" : "date")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load blocked dates" }, { status: 500 });
  }

  return NextResponse.json({ blockedDates: data || [] });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, date, reason } = body;

  if (action === "add") {
    const { error } = await supabaseAdmin
      .from("blocked_dates")
      .insert({ date, reason: reason || null });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "remove") {
    const { error } = await supabaseAdmin
      .from("blocked_dates")
      .delete()
      .eq("date", date);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
