import { NextRequest, NextResponse } from "next/server";
import { supabase, type Admin } from "@/lib/supabase";
import { verifyPassword, createToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const admin = data as Admin;
  if (!verifyPassword(password, admin.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createToken({
    sub: admin.id,
    username: admin.username,
    name: admin.display_name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  const res = NextResponse.json({ ok: true, name: admin.display_name });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
