declare global {
  interface Window {
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: any;
    snaptr?: (...args: any[]) => void;
  }
}

// Read Meta's click/browser cookies — _fbc wraps the fbclid from the ad click
// and is the strongest signal for matching conversions back to ads.
export function getMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const get = (key: string) => {
    const c = cookies.find((c) => c.startsWith(key + "="));
    return c ? decodeURIComponent(c.slice(key.length + 1)) : undefined;
  };
  return { fbp: get("_fbp"), fbc: get("_fbc") };
}

export type TrackEventName =
  | "PageView"
  | "Purchase"
  | "Lead"
  | "AddToCart"
  | "InitiateCheckout"
  | "ViewContent"
  | "CompleteRegistration";

// GA4 only recognises its lowercase recommended event names — a "Purchase"
// event is ingested as a custom event and never feeds Monetization reports.
// PageView is skipped: gtag("config") already emits page_view, and firing it
// again would double-count pageviews.
const GA4_EVENT: Record<TrackEventName, string | null> = {
  PageView: null,
  Purchase: "purchase",
  Lead: "generate_lead",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  ViewContent: "view_item",
  CompleteRegistration: "sign_up",
};

export function trackEvent(
  event: TrackEventName,
  params?: Record<string, any>,
  eventId?: string
): void {
  if (typeof window === "undefined") return;

  if (window.fbq) {
    // eventID lets Meta dedupe this against the matching Conversions API event
    window.fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
  }

  const ga4Event = GA4_EVENT[event];
  if (window.gtag && ga4Event) {
    window.gtag("event", ga4Event, params);
  }

  if (window.ttq) {
    window.ttq.track(event, params);
  }

  if (window.snaptr) {
    const snapEvent =
      event === "PageView" ? "PAGE_VIEW" :
      event === "Purchase" ? "PURCHASE" :
      event === "AddToCart" ? "ADD_CART" :
      event === "ViewContent" ? "VIEW_CONTENT" :
      event === "InitiateCheckout" ? "START_CHECKOUT" :
      event === "Lead" ? "SIGN_UP" :
      "CUSTOM_EVENT_1";
    window.snaptr("track", snapEvent, params);
  }
}

const GOOGLE_ADS_SEND_TO = "AW-18466024911/uMtICLeZq4AdEM_bpOVE";

// Ad attribution tag — stored with a timestamp so an old ad click doesn't
// mark every future booking forever. 30-day window, same as Google's own
// click attribution. Stored as JSON: {"s": "[Ad: ...]", "t": <epoch ms>}.
const AD_SOURCE_KEY = "adSource";
const AD_SOURCE_TTL = 30 * 24 * 60 * 60 * 1000;

export function setAdSource(label: string, gclid?: string | null) {
  if (typeof window === "undefined" || !label) return;
  localStorage.setItem(
    AD_SOURCE_KEY,
    JSON.stringify({ s: label, t: Date.now(), ...(gclid ? { g: gclid } : {}) })
  );
}

export function getAdSource(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AD_SOURCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.s && parsed?.t && Date.now() - parsed.t < AD_SOURCE_TTL) return parsed.s;
  } catch {
    // Pre-TTL format stored the bare label — re-stamp it so ad clicks from
    // before this deploy still attribute, then let it age out normally.
    if (raw.startsWith("[Ad:")) {
      setAdSource(raw);
      return raw;
    }
  }
  localStorage.removeItem(AD_SOURCE_KEY);
  return null;
}

// The raw Google click id captured at landing. Uploaded server-side as an
// offline conversion so ad-attributed sales count even when the browser tag
// was blocked (consent banner, ad blockers).
export function getGclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(AD_SOURCE_KEY) || "");
    if (parsed?.g && typeof parsed.t === "number" && Date.now() - parsed.t < AD_SOURCE_TTL) {
      return parsed.g;
    }
  } catch {}
  return null;
}

// Stash the customer's email before a hosted-checkout redirect (Stripe/SumUp)
// so the post-redirect page can still attach it to the conversion.
const PURCHASE_EMAIL_KEY = "pp_email";

export function stashPurchaseEmail(email: string) {
  if (typeof window === "undefined" || !email) return;
  localStorage.setItem(PURCHASE_EMAIL_KEY, email);
}

function popPurchaseEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const email = localStorage.getItem(PURCHASE_EMAIL_KEY);
  if (email) localStorage.removeItem(PURCHASE_EMAIL_KEY);
  return email || undefined;
}

export function trackPurchase(value: number, currency = "GBP", transactionId?: string, email?: string) {
  const resolvedEmail = email || popPurchaseEmail();
  trackEvent(
    "Purchase",
    {
      value,
      currency,
      ...(transactionId ? { transaction_id: transactionId } : {}),
    },
    transactionId
  );
  // Google Ads conversion — transaction_id stops double-counting on refresh.
  // user_data enables enhanced conversions: gtag hashes the email client-side.
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: GOOGLE_ADS_SEND_TO,
      value,
      currency,
      transaction_id: transactionId || "",
      ...(resolvedEmail ? { user_data: { email: resolvedEmail } } : {}),
    });
  }
}

export function trackLead(value?: number, currency = "GBP") {
  trackEvent("Lead", {
    ...(value ? { value, currency } : {}),
  });
}

export function trackAddToCart(value: number, currency = "GBP", contentName?: string) {
  trackEvent("AddToCart", {
    value,
    currency,
    ...(contentName ? { content_name: contentName } : {}),
  });
}

export function trackInitiateCheckout(value: number, currency = "GBP", eventId?: string) {
  trackEvent(
    "InitiateCheckout",
    {
      value,
      currency,
    },
    eventId
  );
}

export function trackViewContent(contentName: string, value?: number, currency = "GBP") {
  trackEvent("ViewContent", {
    content_name: contentName,
    ...(value ? { value, currency } : {}),
  });
}
