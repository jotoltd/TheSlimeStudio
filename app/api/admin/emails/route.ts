import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend, EMAIL_FROM, CONTACT_EMAIL, logEmail, emailWrapper } from "@/lib/email";

export const runtime = "nodejs";

const TOGGLES = [
  "email_booking_confirmation",
  "email_order_confirmation",
  "email_admin_alerts",
  "email_reward_codes",
] as const;

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: logs }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("email_logs").select("type, status, created_at").gte("created_at", since30),
    supabaseAdmin.from("site_settings").select(TOGGLES.join(", ")).eq("id", 1).single(),
  ]);

  const rows = logs || [];
  const byType: Record<string, { sent: number; failed: number }> = {};
  let sent30 = 0, failed30 = 0, monthCount = 0, todayCount = 0;
  const today = new Date().toDateString();
  for (const l of rows) {
    const t = (byType[l.type] ||= { sent: 0, failed: 0 });
    if (l.status === "sent") { t.sent++; sent30++; } else { t.failed++; failed30++; }
    if (l.created_at >= monthStart.toISOString()) monthCount++;
    if (new Date(l.created_at).toDateString() === today) todayCount++;
  }

  // Resend domain status
  let domainStatus = "unknown";
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      const json = await res.json();
      domainStatus = json?.data?.[0]?.status || "not found";
    } catch {}
  }

  return NextResponse.json({
    configured: !!process.env.RESEND_API_KEY,
    domainStatus,
    sent30,
    failed30,
    monthCount,
    todayCount,
    // Resend free plan limits
    monthQuota: 3000,
    dayQuota: 100,
    byType,
    settings: settings || {},
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Send a test email
  if (body.test) {
    const resend = getResend();
    if (!resend) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: body.test === true ? CONTACT_EMAIL : String(body.test),
        subject: "Test email — The Slime Studio admin",
        html: emailWrapper(`
          <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">Test email</h1>
          <p style="color: #333; font-size: 1rem; line-height: 1.6;">
            This is a test from your admin email settings. If you can see this, transactional email is working.
          </p>
        `),
      });
      await logEmail(String(body.test === true ? CONTACT_EMAIL : body.test), "Test email — The Slime Studio admin", "test", "sent");
      return NextResponse.json({ success: true });
    } catch (e) {
      await logEmail(CONTACT_EMAIL, "Test email — The Slime Studio admin", "test", "failed");
      return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 400 });
    }
  }

  // Update toggles
  if (body.settings && typeof body.settings === "object") {
    const patch: Record<string, boolean> = {};
    for (const k of TOGGLES) {
      if (k in body.settings) patch[k] = !!body.settings[k];
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No valid settings" }, { status: 400 });
    const { error } = await supabaseAdmin.from("site_settings").update(patch).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
