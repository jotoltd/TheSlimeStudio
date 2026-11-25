import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend, EMAIL_FROM, logEmail, emailWrapper, escapeHtml } from "@/lib/email";

export function newVerifyToken(): string {
  return randomBytes(32).toString("hex");
}

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://theslimestudio.co.uk";
}

// Stores a fresh token on the customer and emails the verification link.
// Returns false when Resend isn't configured or the send fails.
export async function sendVerificationEmail(customerId: string, email: string, name: string): Promise<boolean> {
  const token = newVerifyToken();
  const { error } = await supabaseAdmin
    .from("customers")
    .update({ email_verify_token: token, email_verify_sent_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) return false;

  const resend = getResend();
  if (!resend) return false;

  const link = `${siteOrigin()}/api/account/verify?token=${token}`;
  const subject = "Verify your email — The Slime Studio";
  const safeName = escapeHtml(name || "there");
  const html = emailWrapper(`
    <h2 style="font-family:Georgia,serif;color:#2b2350;">Hi ${safeName},</h2>
    <p>Thanks for creating an account at The Slime Studio. Please confirm this email address to start booking sessions and earning loyalty stamps:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}" style="background:#7c6bb0;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Verify my email</a>
    </p>
    <p style="font-size:0.85rem;color:#666;">If the button doesn't work, copy this link into your browser:<br/>${link}</p>
    <p style="font-size:0.85rem;color:#666;">If you didn't create this account, you can ignore this email.</p>
  `);

  try {
    await resend.emails.send({ from: EMAIL_FROM, to: email, subject, html });
    await logEmail(email, subject, "verify_email", "sent");
    return true;
  } catch (e) {
    console.error("Verification email failed:", e);
    await logEmail(email, subject, "verify_email", "failed");
    return false;
  }
}
