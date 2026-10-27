import { NextRequest, NextResponse } from "next/server";
import { supabase, type Admin } from "@/lib/supabase";
import { verifyPassword, createToken } from "@/lib/auth";

export const runtime = "nodejs";

// Brute-force throttle: 5 failed attempts per username+IP per 15 minutes.
// In-memory so it's per-instance on serverless — imperfect but raises the
// cost of password guessing from free to impractical.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  // Prune expired entries so the map doesn't grow forever.
  if (attempts.size > 1000) {
    attempts.forEach((v, k) => { if (now > v.resetAt) attempts.delete(k); });
  }
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rateKey = `${username.trim().toLowerCase()}:${ip}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in 15 minutes." },
      { status: 429 }
    );
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

  attempts.delete(rateKey); // successful login clears the counter

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
