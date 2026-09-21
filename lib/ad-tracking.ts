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

  if (window.gtag) {
    window.gtag("event", event, params);
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
