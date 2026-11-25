import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

// GET — full bookings list for the admin dashboard (replaces direct anon reads)
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let query = supabaseAdmin.from("bookings").select("*").order("date", { ascending: true }).order("time_slot", { ascending: true });
  if (date) query = query.eq("date", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data || [] });
}

const EDITABLE_FIELDS = ["date", "time_slot", "people", "name", "email", "phone", "notes"] as const;

// PATCH — update booking fields (replaces direct anon writes)
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string } & Record<string, unknown>;
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in fields) patch[key] = fields[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }
  if (patch.people !== undefined) {
    const p = Math.floor(Number(patch.people));
    if (!Number.isFinite(p) || p < 1 || p > 50) {
      return NextResponse.json({ error: "Invalid people count" }, { status: 400 });
    }
    patch.people = p;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select("stripe_session_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep a 2-hour booking's `_slot2` block in sync when people changes, so the
  // second hour doesn't keep the stale headcount. No-op for 1-hour bookings.
  if (patch.people !== undefined && updated?.stripe_session_id) {
    await supabaseAdmin
      .from("bookings")
      .update({ people: patch.people })
      .eq("stripe_session_id", `${updated.stripe_session_id}_slot2`);
  }

  return NextResponse.json({ ok: true });
}
