import crypto from "crypto";

// Meta Conversions API — sends server-side copies of pixel events so Meta still
// sees conversions when the browser pixel is blocked (iOS privacy, ad blockers).
// Events carry the same event_id as the matching browser event so Meta dedupes.

const PIXEL_ID = process.env.META_PIXEL_ID || "1084510120839736";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theslimestudio.co.uk";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Meta expects phone as digits only, with country code (UK: 44...)
function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0044")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "44" + digits.slice(1);
  return digits;
}

export type CapiEventInput = {
  eventName: "Purchase" | "InitiateCheckout" | "PageView" | "Lead" | "AddToCart";
  // Must match the eventID sent by the browser pixel for the same action,
  // otherwise Meta counts the conversion twice.
  eventId: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  value?: number | null;
  currency?: string;
  sourceUrl?: string;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export async function sendCapiEvent(input: CapiEventInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return; // CAPI not configured — browser pixel still works

  try {
    const userData: Record<string, unknown> = {};
    if (input.email) userData.em = [sha256(input.email)];
    if (input.phone) userData.ph = [sha256(normalisePhone(input.phone))];
    if (input.name) {
      const parts = input.name.trim().split(/\s+/);
      if (parts[0]) userData.fn = [sha256(parts[0])];
      if (parts.length > 1) userData.ln = [sha256(parts[parts.length - 1])];
    }
    if (input.clientIp) userData.client_ip_address = input.clientIp;
    if (input.userAgent) userData.client_user_agent = input.userAgent;
    if (input.fbp) userData.fbp = input.fbp;
    if (input.fbc) userData.fbc = input.fbc;
    userData.country = [sha256("gb")];

    const event: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: "website",
      event_source_url: input.sourceUrl || `${SITE_URL}/booking`,
      user_data: userData,
    };
    if (input.value != null) {
      event.custom_data = { currency: input.currency || "GBP", value: input.value };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event] }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[capi] ${input.eventName} rejected (${res.status}):`, text.slice(0, 400));
    }
  } catch (e) {
    // Never let tracking failures break a booking
    console.error(`[capi] ${input.eventName} send failed:`, e);
  }
}

// Read Meta's click/browser cookies + client headers from an incoming request.
// fbc is the fbclid wrapper Meta uses to match events back to ad clicks.
export function metaContextFromRequest(req: Request, body?: unknown) {
  const b = body as { fbp?: string; fbc?: string } | undefined;
  const headers = req.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null;
  return {
    clientIp: ip,
    userAgent: headers.get("user-agent") || null,
    fbp: b?.fbp || null,
    fbc: b?.fbc || null,
  };
}
