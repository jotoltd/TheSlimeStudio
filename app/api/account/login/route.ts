import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth";
import { createCustomerToken, CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email?: string; password?: string };

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, password_hash")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Same message whether the account is missing or the password is wrong,
  // so this can't be used to discover which emails have accounts.
  if (!customer || !verifyPassword(password, customer.password_hash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
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
