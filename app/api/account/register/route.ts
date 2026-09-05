import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";
import { createCustomerToken, CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS, isValidEmail } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, email, phone, password } = await req.json() as {
    name?: string; email?: string; phone?: string; password?: string;
  };

  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanName) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "An account already exists with that email. Try signing in instead." },
      { status: 409 }
    );
  }

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      name: cleanName,
      email: cleanEmail,
      phone: (phone || "").trim() || null,
      password_hash: hashPassword(password),
    })
    .select("id, name, email")
    .single();

  if (error || !customer) {
    console.error("Customer registration failed:", error);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }

  // Auto-create a referral code for the new customer
  try {
    const refCode = "REF-" + customer.id.slice(0, 8).toUpperCase();
    await supabaseAdmin.from("discount_codes").insert({
      code: refCode,
      description: `Referral code for ${cleanName}`,
      discount_type: "percentage",
      value: 10,
      scope: "both",
      min_spend: 0,
      max_uses: null,
      used_count: 0,
      active: true,
      referrer_customer_id: customer.id,
      referrer_reward: "loyalty_stamp",
    });
  } catch (e) {
    console.error("Failed to create referral code:", e);
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
