import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend, EMAIL_FROM, logEmail } from "@/lib/email";
import {
  buildAudience,
  listCampaigns,
  loadCampaign,
  saveCampaign,
  deleteCampaign,
  sendCampaignBatch,
  renderCampaignHtml,
  unsubscribedEmails,
  SEGMENTS,
  type Campaign,
} from "@/lib/email-marketing";

export const runtime = "nodejs";
export const maxDuration = 60;

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Counts per segment (audience builds are cheap — a handful of select queries)
  const counts: Record<string, number> = {};
  await Promise.all(
    Object.keys(SEGMENTS).map(async (seg) => {
      try {
        counts[seg] = (await buildAudience(seg)).length;
      } catch {
        counts[seg] = 0;
      }
    })
  );

  const campaigns = (await listCampaigns()).map((c) => ({
    ...c,
    recipients: undefined, // don't ship the queue to the client
    remaining: c.recipients?.length || 0,
  }));

  // Engagement per campaign — the email webhook logs opens/clicks as
  // campaign_open:{id} / campaign_click:{id} in email_logs.
  const { data: engagement } = await supabaseAdmin
    .from("email_logs")
    .select("type, recipient")
    .like("type", "campaign_%");
  const stats: Record<string, { opens: number; clicks: number; bounces: number }> = {};
  const seen = new Set<string>(); // dedupe opens/clicks per recipient
  for (const r of engagement || []) {
    const m = r.type.match(/^campaign_(open|click|bounce|complaint):(.+)$/);
    if (!m) continue;
    const [, kind, id] = m;
    if (kind !== "bounce" && seen.has(`${r.type}:${r.recipient}`)) continue;
    seen.add(`${r.type}:${r.recipient}`);
    const s = (stats[id] ||= { opens: 0, clicks: 0, bounces: 0 });
    if (kind === "open") s.opens++;
    else if (kind === "click") s.clicks++;
    else s.bounces++;
  }
  const statsByCampaign = campaigns.map((c) => ({ ...c, stats: stats[c.id] || { opens: 0, clicks: 0, bounces: 0 } }));

  const unsub = await unsubscribedEmails();
  return NextResponse.json({
    configured: !!process.env.RESEND_API_KEY,
    segments: SEGMENTS,
    counts,
    campaigns: statsByCampaign,
    unsubscribed: unsub.size,
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Rendered preview for the composer iframe
  if (body.action === "preview") {
    const html = renderCampaignHtml(
      { heading: body.heading || "", body: body.body || "", ctaText: body.ctaText, ctaUrl: body.ctaUrl },
      { email: "preview@example.com", name: "Sam" }
    );
    return NextResponse.json({ html });
  }

  // Send a single test email to an address of choice
  if (body.action === "test") {
    const resend = getResend();
    if (!resend) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    const to = String(body.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Invalid test email" }, { status: 400 });
    try {
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: `[TEST] ${String(body.subject || "Untitled campaign")}`,
        html: renderCampaignHtml(
          { heading: body.heading || "", body: body.body || "", ctaText: body.ctaText, ctaUrl: body.ctaUrl },
          { email: to, name: "Test" }
        ),
      });
      if (res.error) throw new Error(res.error.message);
      await logEmail(to, `[TEST] ${body.subject}`, "campaign_test", "sent");
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 400 });
    }
  }

  // Create the campaign + kick off the first batch
  if (body.action === "send") {
    const { name, subject, heading, body: text, ctaText, ctaUrl, audience } = body;
    if (!subject || !heading || !text) return NextResponse.json({ error: "Subject, heading and body are required" }, { status: 400 });
    if (!SEGMENTS[audience]) return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    if (ctaText && ctaUrl && !/^https?:\/\//.test(ctaUrl)) return NextResponse.json({ error: "Button link must start with http(s)" }, { status: 400 });

    const recipients = await buildAudience(audience);
    if (recipients.length === 0) return NextResponse.json({ error: "Audience is empty (everyone may have unsubscribed)" }, { status: 400 });

    const campaign: Campaign = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name: name || subject,
      subject,
      heading,
      body: text,
      ctaText: ctaText || "",
      ctaUrl: ctaUrl || "",
      audience,
      status: "sending",
      recipients,
      total: recipients.length,
      sent: 0,
      failed: 0,
      createdAt: new Date().toISOString(),
    };
    await saveCampaign(campaign);
    const updated = await sendCampaignBatch(campaign);
    return NextResponse.json({ success: true, campaign: { ...updated, recipients: undefined, remaining: updated.recipients.length } });
  }

  // Continue sending — the dashboard calls this until remaining hits 0
  if (body.action === "send_batch") {
    const campaign = await loadCampaign(String(body.id || ""));
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "sending") return NextResponse.json({ error: "Campaign already finished" }, { status: 400 });
    const updated = await sendCampaignBatch(campaign);
    return NextResponse.json({ success: true, campaign: { ...updated, recipients: undefined, remaining: updated.recipients.length } });
  }

  if (body.action === "delete") {
    await deleteCampaign(String(body.id || ""));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
