import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createCustomerToken, CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS } from "@/lib/customer-auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/account/verify?token=... — marks the customer's email verified and
// signs them in. The token is a single-use random value stored on the row.
export async function GET(req: NextRequest) {
  if (rateLimited(`verify:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token || token.length > 200) {
    return NextResponse.json({ error: "Invalid verification link." }, { status: 400 });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, email_verified")
    .eq("email_verify_token", token)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("customers")
    .update({ email_verified: true, email_verify_token: null })
    .eq("id", customer.id);

  if (error) {
    return NextResponse.json({ error: "Could not verify your email. Please try again." }, { status: 500 });
  }

  const session = createCustomerToken({ sub: customer.id, email: customer.email, name: customer.name });
  const res = NextResponse.redirect(new URL("/account?verified=1", req.url));
  res.cookies.set(CUSTOMER_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * CUSTOMER_SESSION_DAYS,
    path: "/",
  });
  return res;
}
