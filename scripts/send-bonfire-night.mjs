// One-off: send the Bonfire Night campaign to the full "all" audience.
// Mirrors web/lib/email-marketing.ts (audience, unsubscribes, rendering,
// logging) so it appears in /dashboard/campaigns like a normal campaign.
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import fs from "fs";

// --- env -------------------------------------------------------------------
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(env.RESEND_API_KEY);
const EMAIL_FROM = "The Slime Studio <noreply@theslimestudio.co.uk>";
const SITE_URL = env.NEXT_PUBLIC_SITE_URL || "https://theslimestudio.co.uk";
const norm = (e) => e.trim().toLowerCase();

// --- campaign content --------------------------------------------------------
const campaign = {
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
  name: "Bonfire Night 2026",
  subject: "Happy Bonfire Night from The Slime Studio",
  heading: "Happy Bonfire Night!",
  body: `Hi {{name}},

Tonight is Bonfire Night, and here at The Slime Studio we will be keeping things cosy inside — but wherever you are celebrating, we hope you have a brilliant evening under the fireworks.

A few reminders to keep everyone safe tonight:

• Only watch fireworks at organised displays and follow the stewards' instructions
• Keep a safe distance from bonfires and fireworks — never touch or pick up anything that has fallen
• Keep children, pets and flammable items well away from the fire
• If you find an unexploded firework, do not touch it — call the fire service

Fancy skipping the cold and chaos entirely? Pop in for a slime session instead — everything is provided and the fun happens rain or shine.

Book your session online and we will see you soon.

The Slime Studio`,
  ctaText: "Book a Session",
  ctaUrl: `${SITE_URL}/booking`,
  audience: "all",
  status: "sending",
  recipients: [],
  names: {},
  total: 0,
  sent: 0,
  failed: 0,
  createdAt: new Date().toISOString(),
};

// --- helpers replicated from lib/email-marketing.ts --------------------------
const unsubToken = (email) =>
  crypto.createHmac("sha256", env.AUTH_SECRET).update(`unsub:${norm(email)}`).digest("hex").slice(0, 24);
const unsubscribeUrl = (email) =>
  `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(norm(email))}&t=${unsubToken(email)}`;

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function trackableUrl(url, tag) {
  try {
    const u = new URL(url);
    if (!/theslimestudio\.co\.uk$/.test(u.hostname) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", tag);
    return u.toString();
  } catch { return url; }
}

function emailWrapper(content) {
  return `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${SITE_URL}/images/logo-email.png" alt="The Slime Studio" width="180" style="max-width: 180px; height: auto;" />
      </div>
      ${content}
      <p style="color: #ff2d78; font-size: 0.9rem; margin-top: 24px;">The Slime Studio</p>
    </div>`;
}

function renderHtml(recipient) {
  const firstName = (recipient.name || "").trim().split(/\s+/)[0] || "there";
  const personalize = (s) => escapeHtml(s).replace(/\{\{name\}\}/gi, escapeHtml(firstName));
  const paragraphs = campaign.body
    .split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="color: #333; font-size: 1rem; line-height: 1.6;">${personalize(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  const cta = `<div style="text-align: center; margin: 28px 0;">
      <a href="${trackableUrl(campaign.ctaUrl, campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))}" style="display: inline-block; background: linear-gradient(135deg, #ff2d78, #a855f7); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 1rem; padding: 14px 36px; border-radius: 999px;">${escapeHtml(campaign.ctaText)}</a>
    </div>`;
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${personalize(campaign.heading)}</h1>
    ${paragraphs}
    ${cta}
    <p style="color: #999; font-size: 0.7rem; line-height: 1.5; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;">
      The Slime Studio, Holt, Norfolk · <a href="mailto:studio@theslimestudio.co.uk" style="color: #999;">studio@theslimestudio.co.uk</a><br>
      <a href="${unsubscribeUrl(recipient.email)}" style="color: #999;">Unsubscribe from marketing emails</a>
    </p>`);
}

const saveCampaign = () =>
  supabase.from("site_content").upsert(
    { key: `email_campaign_${campaign.id}`, value: JSON.stringify(campaign) },
    { onConflict: "key" }
  );
const logEmail = (recipient, status) =>
  supabase.from("email_logs").insert({ recipient, subject: campaign.subject, type: `campaign:${campaign.id}`, status });

// --- build "all" audience (same as buildAudience("all")) -----------------------
const out = new Map();
const addRows = (rows, emailKey, nameKey) => {
  for (const r of rows || []) {
    const e = r[emailKey];
    if (e && !out.has(norm(e))) out.set(norm(e), r[nameKey] || "");
  }
};
const [{ data: bks }, { data: evts }, { data: gcs }, { data: custs }, { data: unsubs }] = await Promise.all([
  supabase.from("bookings").select("email, name").eq("payment_status", "paid"),
  supabase.from("special_event_bookings").select("email, name").eq("payment_status", "paid"),
  supabase.from("gift_cards").select("purchaser_email, purchaser_name"),
  supabase.from("customers").select("email, name"),
  supabase.from("site_content").select("key").like("key", "unsub_%"),
]);
addRows(bks, "email", "name");
addRows(evts, "email", "name");
addRows(gcs, "purchaser_email", "purchaser_name");
addRows(custs, "email", "name");
const unsubSet = new Set((unsubs || []).map((r) => r.key.slice(6)));
campaign.recipients = Array.from(out.entries())
  .filter(([e]) => !unsubSet.has(e))
  .map(([email, name]) => ({ email, name }));
campaign.names = Object.fromEntries(campaign.recipients.map((r) => [r.email, r.name]).filter(([, n]) => n));
campaign.total = campaign.recipients.length;

console.log(`Audience: ${campaign.total} recipients (${unsubSet.size} unsubscribed excluded)`);
if (!campaign.total) { console.log("Nothing to send."); process.exit(1); }

await saveCampaign();

// --- send --------------------------------------------------------------------
const SEND_BATCH = 12;
let consecutiveErrors = 0;
while (campaign.recipients.length) {
  const batch = campaign.recipients.splice(0, SEND_BATCH);
  for (const r of batch) {
    const to = norm(r.email);
    const firstName = (r.name || "").trim().split(/\s+/)[0] || "there";
    try {
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: campaign.subject.replace(/\{\{name\}\}/gi, firstName),
        html: renderHtml({ email: to, name: r.name }),
      });
      if (res.error) throw new Error(res.error.message || "send failed");
      campaign.sent++;
      await logEmail(to, "sent");
      consecutiveErrors = 0;
    } catch (e) {
      campaign.failed++;
      consecutiveErrors++;
      console.log(`FAIL ${to}: ${e.message}`);
      await logEmail(to, "failed");
      if (consecutiveErrors >= 10) {
        campaign.status = "sending"; // stays resumable via dashboard send_batch
        await saveCampaign();
        console.log("10 consecutive failures — aborting. Campaign saved as 'sending' for resume.");
        process.exit(2);
      }
    }
    await saveCampaign();
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(`Progress: ${campaign.sent} sent, ${campaign.failed} failed, ${campaign.recipients.length} remaining`);
}

campaign.status = campaign.sent > 0 ? "sent" : "failed";
campaign.sentAt = new Date().toISOString();
await saveCampaign();
console.log(`Done. sent=${campaign.sent} failed=${campaign.failed} campaign=${campaign.id}`);
