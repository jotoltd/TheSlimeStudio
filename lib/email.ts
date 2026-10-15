import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function logEmail(recipient: string, subject: string, type: string, status: string = "sent") {
  try {
    await supabaseAdmin.from("email_logs").insert({ recipient, subject, type, status });
  } catch {}
}

// Maps email types to the toggles in site_settings (managed in /dashboard/email-logs)
const EMAIL_SETTING_KEYS: Record<string, string> = {
  booking_confirmation: "email_booking_confirmation",
  cancellation: "email_booking_confirmation",
  event_booking_confirmation: "email_booking_confirmation",
  order_confirmation: "email_order_confirmation",
  gift_card: "email_order_confirmation",
  admin_notification: "email_admin_alerts",
  event_booking_admin: "email_admin_alerts",
  reward_code: "email_reward_codes",
};

let _tplCache: { at: number; map: Record<string, string> } | null = null;

// Custom wording overrides stored in site_content (email_tpl_* keys), edited in /dashboard/email-logs
export async function emailTemplates(): Promise<Record<string, string>> {
  try {
    if (!_tplCache || Date.now() - _tplCache.at > 60_000) {
      const { data } = await supabaseAdmin.from("site_content").select("key, value").like("key", "email_tpl_%");
      const map: Record<string, string> = {};
      (data || []).forEach((r: { key: string; value: string }) => { if (r.value?.trim()) map[r.key] = r.value; });
      _tplCache = { at: Date.now(), map };
    }
    return _tplCache.map;
  } catch {
    return _tplCache?.map || {};
  }
}

let _settingsCache: { at: number; map: Record<string, boolean> } | null = null;

export async function emailEnabled(type: string): Promise<boolean> {
  try {
    if (!_settingsCache || Date.now() - _settingsCache.at > 60_000) {
      const { data } = await supabaseAdmin
        .from("site_settings")
        .select("email_admin_alerts, email_booking_confirmation, email_order_confirmation, email_reward_codes")
        .eq("id", 1)
        .single();
      _settingsCache = { at: Date.now(), map: (data as Record<string, boolean>) || {} };
    }
    const col = EMAIL_SETTING_KEYS[type];
    if (!col) return true;
    return _settingsCache.map[col] !== false;
  } catch {
    return true; // fail open — never silently break email
  }
}

export const EMAIL_FROM = "The Slime Studio <noreply@theslimestudio.co.uk>";
export const CONTACT_EMAIL = "studio@theslimestudio.co.uk";

// Turns "[Ad: Facebook/Instagram Ad, utm:ig/My Campaign]" into "Instagram Ad — campaign My Campaign"
export function adSourceLabel(adSource: string): string {
  const inner = adSource.replace(/\s*\[gclid:[^\]]*\]/gi, "").replace(/^\[Ad:\s*/i, "").replace(/\]\s*$/, "").trim();
  const m = inner.match(/utm:([a-z]+)(?:\/([^\],]+))?/i);
  if (m) {
    const map: Record<string, string> = { ig: "Instagram", instagram: "Instagram", fb: "Facebook", facebook: "Facebook", meta: "Meta", google: "Google", tiktok: "TikTok", snapchat: "Snapchat" };
    const platform = map[m[1].toLowerCase()] || m[1];
    if (platform.toLowerCase() === "email") {
      return `Email${m[2] ? ` — campaign "${m[2]}"` : ""}`;
    }
    return `${platform} Ad${m[2] ? ` — campaign "${m[2]}"` : ""}`;
  }
  return inner;
}

export function emailWrapper(content: string): string {
  return `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://theslimestudio.co.uk/images/logo.png" alt="The Slime Studio" width="180" style="max-width: 180px; height: auto;" />
      </div>
      ${content}
      <p style="color: #ff2d78; font-size: 0.9rem; margin-top: 24px;">
        The Slime Studio
      </p>
    </div>
  `;
}

export function bookingConfirmationHtml(opts: {
  name: string;
  date: string;
  timeSlot: string;
  people: number;
  totalPrice: number;
  isParty?: boolean;
}, ov: Record<string, string> = {}): string {
  const dateStr = opts.date ? new Date(opts.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${ov.email_tpl_booking_heading || "Booking Confirmed!"}</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_booking_body || `${opts.isParty ? "Your birthday party booking at The Slime Studio is confirmed!" : "Your slime-making session at The Slime Studio is confirmed!"} We can't wait to see you.`}
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.timeSlot}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.isParty ? "Children" : "People"}:</strong> ${opts.people}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Total:</strong> &pound;${opts.totalPrice.toFixed(2)}</p>
      ${opts.isParty ? '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Birthday Party (1.5 hours)</p>' : '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Standard Session (1 hour)</p>'}
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_booking_note || (opts.isParty
        ? "Please arrive 10 minutes early so we can get everyone set up. Each child will make their own slime to take home!"
        : "Please arrive 5 minutes before your session. Everything you need is provided!"
      )}
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Need to make changes? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}

export function cancellationHtml(opts: {
  name: string;
  date: string;
  timeSlot: string;
  people: number;
  isParty?: boolean;
}, ov: Record<string, string> = {}): string {
  const dateStr = opts.date ? new Date(opts.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${ov.email_tpl_cancellation_heading || "Booking Cancelled"}</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_cancellation_body || "We're writing to let you know that your Slime Studio booking has been cancelled."}
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.timeSlot}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.isParty ? "Children" : "People"}:</strong> ${opts.people}</p>
      ${opts.isParty ? '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Birthday Party</p>' : ''}
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      If you believe this is an error, please contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}

export function eventBookingConfirmationHtml(opts: {
  name: string;
  eventTitle: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  quantity: number;
  totalPrice: number;
  pricingModel: string;
}, ov: Record<string, string> = {}): string {
  const dateStr = opts.date ? new Date(opts.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${ov.email_tpl_event_heading || "Event Booking Confirmed!"}</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_event_body || `Your booking for <strong>${opts.eventTitle}</strong> at The Slime Studio is confirmed! We can't wait to see you.`}
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Event:</strong> ${opts.eventTitle}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.startTime}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Duration:</strong> ${opts.durationMinutes} minutes</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.pricingModel === "per_person" ? "People" : "Tickets"}:</strong> ${opts.quantity}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Total:</strong> &pound;${opts.totalPrice.toFixed(2)}</p>
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_event_note || "Please arrive 5 minutes before the event starts. Everything you need is provided!"}
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Need to make changes? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}

export async function sendEventBookingEmails(opts: {
  name: string;
  email: string;
  eventTitle: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  quantity: number;
  totalPrice: number;
  pricingModel: string;
  adSource?: string | null;
}) {
  const resend = getResend();
  if (!resend) {
    console.log("Resend not configured, skipping event booking email for", opts.email);
    return;
  }

  const ov = await emailTemplates();
  const html = eventBookingConfirmationHtml(opts, ov);
  const subject = ov.email_tpl_event_subject || `Event Booking Confirmed — ${opts.eventTitle} — The Slime Studio`;

  if (await emailEnabled("event_booking_confirmation")) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: opts.email,
      subject,
      html,
    });
    await logEmail(opts.email, subject, "event_booking_confirmation", "sent");
  } catch (e) {
    console.error("Failed to send event booking email:", e);
    await logEmail(opts.email, subject, "event_booking_confirmation", "failed");
  }
  }

  // Send admin notification
  if (await emailEnabled("admin_notification")) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: `New Event Booking — ${opts.eventTitle}`,
      html: emailWrapper(`
        <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">New Event Booking</h1>
        <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Event:</strong> ${opts.eventTitle}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${opts.date}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.startTime}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Customer:</strong> ${opts.name}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Email:</strong> ${opts.email}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.pricingModel === "per_person" ? "People" : "Tickets"}:</strong> ${opts.quantity}</p>
          <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Total:</strong> &pound;${opts.totalPrice.toFixed(2)}</p>
          ${opts.adSource ? `<p style="margin: 8px 0 4px; color: #1877f2; font-size: 0.9rem;"><strong>📣 Source:</strong> ${adSourceLabel(opts.adSource)}</p>` : ""}
          <p style="margin: 8px 0 4px; color: #888; font-size: 0.8rem;"><strong>Received:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      `),
    });
    await logEmail(CONTACT_EMAIL, `New Event Booking — ${opts.eventTitle}`, "event_booking_admin", "sent");
  } catch (e) {
    console.error("Failed to send admin event booking email:", e);
  }
  }
}

export function orderConfirmationHtml(opts: {
  orderNumber: string;
  name: string;
  items: { name: string; price: number; quantity: number; image_url: string | null }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
}, ov: Record<string, string> = {}): string {
  const itemsHtml = opts.items.map((item) => `
    <tr>
      <td style="padding: 8px 0; color: #333; font-size: 0.9rem;">${item.name} × ${item.quantity}</td>
      <td style="padding: 8px 0; color: #333; font-size: 0.9rem; text-align: right;">&pound;${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">${ov.email_tpl_order_heading || "Order Confirmed!"}</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${ov.email_tpl_order_body || "Thank you for your order from The Slime Studio!"}
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Order:</strong> ${opts.orderNumber}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Delivery:</strong> ${opts.shippingMethod === "collection" ? "Collection from studio" : "Delivery"}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="border-bottom: 1px solid #eee;">
          <th style="padding: 8px 0; text-align: left; color: #666; font-size: 0.8rem; text-transform: uppercase;">Item</th>
          <th style="padding: 8px 0; text-align: right; color: #666; font-size: 0.8rem; text-transform: uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div style="border-top: 1px solid #eee; padding-top: 12px;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem; text-align: right;"><strong>Subtotal:</strong> &pound;${opts.subtotal.toFixed(2)}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem; text-align: right;"><strong>Shipping:</strong> &pound;${opts.shippingCost.toFixed(2)}</p>
      <p style="margin: 4px 0; color: #333; font-size: 1.1rem; text-align: right;"><strong>Total:</strong> &pound;${opts.total.toFixed(2)}</p>
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6; margin-top: 16px;">
      ${ov.email_tpl_order_note || (opts.shippingMethod === "collection"
        ? "We'll let you know when your order is ready to collect from our studio at Unit A, Feathers Yard, Holt, NR25 6BF."
        : "We'll dispatch your order as soon as possible and send you tracking information.")}
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Questions? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}

export async function sendOrderConfirmationEmail(opts: {
  orderNumber: string;
  name: string;
  email: string;
  items: { name: string; price: number; quantity: number; image_url: string | null }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.log("Resend not configured, skipping order email for", opts.email);
    return;
  }

  const ov = await emailTemplates();
  const html = orderConfirmationHtml(opts, ov);
  const subject = ov.email_tpl_order_subject || `Order Confirmed — ${opts.orderNumber} — The Slime Studio`;

  if (!(await emailEnabled("order_confirmation"))) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: opts.email,
      subject,
      html,
    });
    await logEmail(opts.email, subject, "order_confirmation", "sent");
  } catch (e) {
    console.error("Failed to send order email:", e);
    await logEmail(opts.email, subject, "order_confirmation", "failed");
  }
}
