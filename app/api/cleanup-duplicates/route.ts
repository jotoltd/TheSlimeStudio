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

  // Fetch all bookings with stripe_session_id, ordered by created_at ascending
  // so the oldest (first) booking is kept
  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, stripe_session_id, created_at, name, date, time_slot")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch bookings: " + error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ success: true, deleted: 0, message: "No bookings to check." });
  }

  // Group by stripe_session_id and find duplicates
  const seen = new Map<string, string>(); // stripe_session_id -> first booking id
  const toDelete: string[] = [];
  let duplicateGroups = 0;

  for (const b of bookings) {
    const sid = b.stripe_session_id;
    if (!sid || sid.startsWith("manual_")) continue; // skip manual bookings

    if (seen.has(sid)) {
      // This is a duplicate — mark for deletion
      toDelete.push(b.id);
      duplicateGroups++;
    } else {
      seen.set(sid, b.id);
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ success: true, deleted: 0, message: "No duplicate bookings found." });
  }

  // Delete duplicate bookings
  const { error: deleteError } = await supabaseAdmin
    .from("bookings")
    .delete()
    .in("id", toDelete);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete duplicates: " + deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted: toDelete.length,
    duplicateGroups: duplicateGroups,
    message: `Deleted ${toDelete.length} duplicate booking(s) from ${duplicateGroups} group(s).`,
  });
}
