import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingIds, action } = await req.json();
  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    return NextResponse.json({ error: "No bookings selected" }, { status: 400 });
  }

  if (action === "delete") {
    const { error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .in("id", bookingIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: bookingIds.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
