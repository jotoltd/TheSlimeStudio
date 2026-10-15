import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend, EMAIL_FROM, logEmail, emailWrapper } from "@/lib/email";

// ---------------------------------------------------------------------------
// Email marketing — campaigns live in site_content (key `email_campaign_*`),
// unsubscribes in `unsub_{email}`, per-send outcomes in email_logs with
// type `campaign:{id}`. No new tables needed.
// ---------------------------------------------------------------------------

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  heading: string;
  body: string; // plain text, blank lines split paragraphs
  ctaText?: string;
  ctaUrl?: string;
  audience: string;
  status: "sending" | "sent" | "failed";
  recipients: Recipient[]; // queue shrinks as batches go out
  names?: Record<string, string>; // email -> name snapshot for reporting
  total: number;
  sent: number;
  failed: number;
  createdAt: string;
  sentAt?: string;
};

export type Recipient = { email: string; name: string };

const norm = (e: string) => e.trim().toLowerCase();
const campaignKey = (id: string) => `email_campaign_${id}`;
const unsubKey = (e: string) => `unsub_${norm(e)}`;

// --- unsubscribe tokens ------------------------------------------------------

function unsubSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", unsubSecret()).update(`unsub:${norm(email)}`).digest("hex").slice(0, 24);
}

export function verifyUnsub(email: string, token: string): boolean {
  try {
    const expected = Buffer.from(unsubToken(email));
    const got = Buffer.from(String(token || ""));
    return expected.length === got.length && crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

export async function unsubscribeEmail(email: string): Promise<void> {
  await supabaseAdmin.from("site_content").upsert(
    { key: unsubKey(email), value: new Date().toISOString() },
    { onConflict: "key" }
  );
}

export async function unsubscribedEmails(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from("site_content").select("key").like("key", "unsub_%");
  return new Set((data || []).map((r) => r.key.slice(6)));
}

export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://theslimestudio.co.uk";
  return `${base}/api/unsubscribe?e=${encodeURIComponent(norm(email))}&t=${unsubToken(email)}`;
}

// --- audience ----------------------------------------------------------------

export const SEGMENTS: Record<string, string> = {
  all: "Everyone (all contacts)",
  customers: "Paying customers (bookings + events)",
  recent: "Recent customers (last 90 days)",
  lapsed: "Lapsed customers (not booked in 90+ days)",
  giftcards: "Gift card buyers",
  accounts: "Registered account holders",
};

export async function buildAudience(segment: string): Promise<Recipient[]> {
  const out = new Map<string, string>(); // email -> name

  const addBookings = async () => {
    const [{ data: bks }, { data: evts }] = await Promise.all([
      supabaseAdmin.from("bookings").select("email, name, created_at").eq("payment_status", "paid"),
      supabaseAdmin.from("special_event_bookings").select("email, name, created_at").eq("payment_status", "paid"),
    ]);
    const rows = [...(bks || []), ...(evts || [])].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    for (const r of rows) if (r.email && !out.has(norm(r.email))) out.set(norm(r.email), r.name || "");
  };

  const addGiftCards = async () => {
    const { data } = await supabaseAdmin.from("gift_cards").select("purchaser_email, purchaser_name");
    for (const r of data || []) if (r.purchaser_email && !out.has(norm(r.purchaser_email))) out.set(norm(r.purchaser_email), r.purchaser_name || "");
  };

  const addAccounts = async () => {
    const { data } = await supabaseAdmin.from("customers").select("email, name");
    for (const r of data || []) if (r.email && !out.has(norm(r.email))) out.set(norm(r.email), r.name || "");
  };

  if (segment === "customers" || segment === "all") await addBookings();
  if (segment === "giftcards" || segment === "all") await addGiftCards();
  if (segment === "accounts" || segment === "all") await addAccounts();

  if (segment === "recent" || segment === "lapsed") {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: bks }, { data: evts }] = await Promise.all([
      supabaseAdmin.from("bookings").select("email, name, created_at").eq("payment_status", "paid"),
      supabaseAdmin.from("special_event_bookings").select("email, name, created_at").eq("payment_status", "paid"),
    ]);
    const latest = new Map<string, { name: string; at: string }>();
    [...(bks || []), ...(evts || [])].forEach((r) => {
      if (!r.email) return;
      const e = norm(r.email);
      if (!latest.has(e) || (r.created_at || "") > latest.get(e)!.at) latest.set(e, { name: r.name || "", at: r.created_at || "" });
    });
    latest.forEach((v, e) => {
      const recent = v.at >= cutoff;
      if ((segment === "recent" && recent) || (segment === "lapsed" && !recent)) out.set(e, v.name);
    });
  }

  const unsub = await unsubscribedEmails();
  return Array.from(out.entries())
    .filter(([e]) => !unsub.has(e))
    .map(([email, name]) => ({ email, name }));
}

// --- campaign storage ---------------------------------------------------------

export async function saveCampaign(c: Campaign): Promise<void> {
  await supabaseAdmin.from("site_content").upsert(
    { key: campaignKey(c.id), value: JSON.stringify(c) },
    { onConflict: "key" }
  );
}

export async function loadCampaign(id: string): Promise<Campaign | null> {
  const { data } = await supabaseAdmin.from("site_content").select("value").eq("key", campaignKey(id)).single();
  if (!data?.value) return null;
  try { return JSON.parse(data.value); } catch { return null; }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data } = await supabaseAdmin.from("site_content").select("value").like("key", "email_campaign_%");
  return (data || [])
    .map((r) => { try { return JSON.parse(r.value) as Campaign; } catch { return null; } })
    .filter((c): c is Campaign => !!c)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteCampaign(id: string): Promise<void> {
  await supabaseAdmin.from("site_content").delete().eq("key", campaignKey(id));
}

// --- rendering ---------------------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Tag internal links so GA4 reports them under the Email channel and the
// site's own ad-attribution picks up the campaign (utm params are captured
// at landing and stored with the booking).
function trackableUrl(url: string, campaignTag: string): string {
  try {
    const u = new URL(url);
    if (!/theslimestudio\.co\.uk$/.test(u.hostname) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", campaignTag);
    return u.toString();
  } catch {
    return url;
  }
}

export function renderCampaignHtml(c: Pick<Campaign, "heading" | "body" | "ctaText" | "ctaUrl"> & { campaignTag?: string }, recipient: { email: string; name?: string }): string {
  const firstName = (recipient.name || "").trim().split(/\s+/)[0] || "there";
  const personalize = (s: string) => escapeHtml(s).replace(/\{\{name\}\}/gi, escapeHtml(firstName));

  const paragraphs = c.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="color: #333; font-size: 1rem; line-height: 1.6;">${personalize(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const cta = c.ctaText && c.ctaUrl
    ? `<div style="text-align: center; margin: 28px 0;">
        <a href="${trackableUrl(c.ctaUrl, c.campaignTag || "campaign")}" style="display: inline-block; background: linear-gradient(135deg, #ff2d78, #a855f7); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 1rem; padding: 14px 36px; border-radius: 999px;">${escapeHtml(c.ctaText)}</a>
      </div>`
    : "";

  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${personalize(c.heading)}</h1>
    ${paragraphs}
    ${cta}
    <p style="color: #999; font-size: 0.7rem; line-height: 1.5; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;">
      The Slime Studio, Holt, Norfolk · <a href="mailto:studio@theslimestudio.co.uk" style="color: #999;">studio@theslimestudio.co.uk</a><br>
      <a href="${unsubscribeUrl(recipient.email)}" style="color: #999;">Unsubscribe from marketing emails</a>
    </p>
  `);
}

// --- sending ------------------------------------------------------------------

// Resend free tier ~2 req/s; keep batches small enough to finish inside a
// serverless invocation so the dashboard can page through the queue.
export const SEND_BATCH = 40;

export async function sendCampaignBatch(campaign: Campaign): Promise<Campaign> {
  const resend = getResend();
  if (!resend) throw new Error("RESEND_API_KEY not configured");

  const batch = campaign.recipients.splice(0, SEND_BATCH);
  for (const r of batch) {
    const to = norm(r.email);
    const firstName = (r.name || "").trim().split(/\s+/)[0] || "there";
    try {
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: campaign.subject.replace(/\{\{name\}\}/gi, firstName),
        html: renderCampaignHtml({ ...campaign, campaignTag: campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || campaign.id }, { email: to, name: r.name }),
      });
      if (res.error) throw new Error(res.error.message || "send failed");
      campaign.sent++;
      await logEmail(to, campaign.subject, `campaign:${campaign.id}`, "sent");
    } catch {
      campaign.failed++;
      await logEmail(to, campaign.subject, `campaign:${campaign.id}`, "failed");
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  if (campaign.recipients.length === 0) {
    campaign.status = campaign.sent > 0 ? "sent" : "failed";
    campaign.sentAt = new Date().toISOString();
  }
  await saveCampaign(campaign);
  return campaign;
}
