import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";
import { isValidEmail } from "@/lib/customer-auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/customer-verification";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (rateLimited(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

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
    .select("id, email_verified")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) {
    // If the account exists but was never verified, resend the link instead of
    // locking the user out — they still can't take over someone else's email
    // without proving inbox access.
    if (existing.email_verified === false) {
      const sent = await sendVerificationEmail(existing.id, cleanEmail, cleanName);
      return NextResponse.json(
        { error: "An account already exists with that email. We've sent a verification link — check your inbox.", verifySent: sent },
        { status: 409 }
      );
    }
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
      email_verified: false,
    })
    .select("id, name, email")
    .single();

  if (error || !customer) {
    console.error("Customer registration failed:", error);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }

  // Auto-create a referral code for the new customer — only while the
  // referrals switch is on in Settings → Loyalty.
  let referralsOn = true;
  try {
    const { data: siteSettings } = await supabaseAdmin
      .from("site_settings").select("referrals_enabled").eq("id", 1).single();
    if (siteSettings && siteSettings.referrals_enabled === false) referralsOn = false;
  } catch { /* column missing → default to on */ }

  if (referralsOn) {
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
  }

  const verifySent = await sendVerificationEmail(customer.id, customer.email, customer.name);

  // No session is issued until the email is verified — this is what stops
  // someone registering another person's address and reading their bookings.
  return NextResponse.json({
    ok: true,
    verifyRequired: true,
    verifySent,
    email: customer.email,
    message: verifySent
      ? "Account created! Check your email for a verification link to activate it."
      : "Account created, but we couldn't send the verification email — use 'Resend verification' on the sign-in page.",
  });
}
