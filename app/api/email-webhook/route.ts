import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Resend sends Svix-signed webhooks for opens/clicks/bounces. Verified with
// the signing secret captured when the webhook was created (stored in
// site_content as resend_webhook_secret).

async function webhookSecret(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "resend_webhook_secret")
    .single();
  return data?.value || null;
}

function verifySvix(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature") || "";
  if (!id || !timestamp || !signatures) return false;

  // Reject replays older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  return signatures.split(" ").some((sig) => {
    const [version, value] = sig.split(",");
    if (version !== "v1" || !value) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(value);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

// Attribute an engagement event back to its campaign send — email_logs
// records sends as type `campaign:{id}` for that recipient + subject.
async function attributeToCampaign(recipient: string, subject: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("email_logs")
    .select("type")
    .eq("recipient", recipient.toLowerCase())
    .eq("subject", subject)
    .like("type", "campaign:%")
    .order("created_at", { ascending: false })
    .limit(1);
  const type = data?.[0]?.type || "";
  return type.startsWith("campaign:") ? type.slice(9) : null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = await webhookSecret();
  if (!secret || !verifySvix(raw, req.headers, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { to?: string[]; subject?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const recipient = event.data?.to?.[0]?.toLowerCase();
  const subject = event.data?.subject || "";
  if (!recipient) return NextResponse.json({ ok: true });

  const campaignId = await attributeToCampaign(recipient, subject);
  const logType =
    event.type === "email.opened" ? "campaign_open" :
    event.type === "email.clicked" ? "campaign_click" :
    event.type === "email.bounced" ? "campaign_bounce" :
    event.type === "email.complained" ? "campaign_complaint" : null;

  if (logType) {
    await supabaseAdmin.from("email_logs").insert({
      recipient,
      subject,
      type: campaignId ? `${logType}:${campaignId}` : logType,
      status: "sent",
    });
  }
  return NextResponse.json({ ok: true });
}
