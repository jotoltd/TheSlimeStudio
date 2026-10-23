import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hashPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

function getAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return token ? verifyToken(token) : null;
}

// GET /api/admin/admins — list admin accounts (no password hashes)
export async function GET(req: NextRequest) {
  if (!getAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id, username, display_name, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "Failed to load admins" }, { status: 500 });
  }
  return NextResponse.json({ admins: data || [] });
}

// POST /api/admin/admins — create a new admin {username, display_name, password}
export async function POST(req: NextRequest) {
  if (!getAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username, display_name, password } = await req.json();
  const uname = String(username || "").trim().toLowerCase();
  const name = String(display_name || "").trim();

  if (!USERNAME_RE.test(uname)) {
    return NextResponse.json(
      { error: "Username must be 3–32 characters: letters, numbers, _ . -" },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("admins").select("id").eq("username", uname).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("admins")
    .insert({ username: uname, display_name: name, password_hash: hashPassword(password) })
    .select("id, username, display_name, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
  return NextResponse.json({ admin: data });
}

// PATCH /api/admin/admins — reset a password {id, password}
export async function PATCH(req: NextRequest) {
  if (!getAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, password } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing admin id" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from("admins").update({ password_hash: hashPassword(password) }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/admins?id=... — remove an admin (can't remove yourself
// or the last remaining admin)
export async function DELETE(req: NextRequest) {
  const me = getAdmin(req);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing admin id" }, { status: 400 });
  }
  if (id === me.sub) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }
  const { count } = await supabaseAdmin
    .from("admins").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "Can't remove the last admin account" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("admins").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to remove admin" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
