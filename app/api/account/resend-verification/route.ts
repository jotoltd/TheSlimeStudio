import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/customer-verification";

export const runtime = "nodejs";

// POST { email, password } — resend the verification email. Requires the
// account password so this can't be used to spam arbitrary inboxes, and only
// works for accounts that exist and are still unverified.
export async function POST(req: NextRequest) {
  if (rateLimited(`resend-verify:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const { email, password } = await req.json() as { email?: string; password?: string };
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { verifyPassword } = await import("@/lib/auth");
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, password_hash, email_verified")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Generic response either way — don't reveal whether the account exists.
  if (!customer || !verifyPassword(password, customer.password_hash) || customer.email_verified !== false) {
    return NextResponse.json({ ok: true });
  }

  await sendVerificationEmail(customer.id, customer.email, customer.name);
  return NextResponse.json({ ok: true });
}
