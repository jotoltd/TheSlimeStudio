import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth";
import { createCustomerToken, CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS } from "@/lib/customer-auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (rateLimited(`acct-login:${clientIp(req)}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const { email, password } = await req.json() as { email?: string; password?: string };

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, password_hash, email_verified")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Same message whether the account is missing or the password is wrong,
  // so this can't be used to discover which emails have accounts.
  if (!customer || !verifyPassword(password, customer.password_hash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  if (customer.email_verified === false) {
    return NextResponse.json(
      { error: "Please verify your email address before signing in.", unverified: true },
      { status: 403 }
    );
  }

  const token = createCustomerToken({ sub: customer.id, email: customer.email, name: customer.name });

  const res = NextResponse.json({ ok: true, name: customer.name, email: customer.email });
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * CUSTOMER_SESSION_DAYS,
    path: "/",
  });
  return res;
}
