import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!(token && verifyToken(token));
}

// POST /api/waitlist — public: join the waitlist for a sold-out slot
export async function POST(req: NextRequest) {
  const { name, email, date, time_slot, people } = await req.json();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim() || null;
  const party = Math.max(1, Math.min(20, Math.floor(Number(people)) || 1));

  if (!EMAIL_RE.test(cleanEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!time_slot || typeof time_slot !== "string") {
    return NextResponse.json({ error: "Missing time slot" }, { status: 400 });
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "That date has already passed" }, { status: 400 });
  }

  // Don't double-add the same email to the same slot
  const { data: existing } = await supabaseAdmin
    .from("waitlist").select("id")
    .eq("email", cleanEmail).eq("date", date).eq("time_slot", time_slot)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await supabaseAdmin.from("waitlist").insert({
    name: cleanName, email: cleanEmail, date, time_slot, people: party,
  });
  if (error) {
    return NextResponse.json({ error: "Couldn't join the waitlist — please try again" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// GET /api/waitlist — admin: list waitlist entries (upcoming first)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("waitlist").select("*").gte("date", today)
    .order("date", { ascending: true }).order("time_slot", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
  }
  return NextResponse.json({ waitlist: data || [] });
}

// PATCH /api/waitlist — admin: mark an entry notified/clear flag {id, notified}
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, notified } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from("waitlist")
    .update({ notified_at: notified ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/waitlist?id=... — admin: remove an entry
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("waitlist").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
