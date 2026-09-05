declare global {
  interface Window {
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: any;
    snaptr?: (...args: any[]) => void;
  }
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
  params?: Record<string, any>
): void {
  if (typeof window === "undefined") return;

  if (window.fbq) {
    window.fbq("track", event, params);
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

export function trackPurchase(value: number, currency = "GBP", transactionId?: string) {
  trackEvent("Purchase", {
    value,
    currency,
    ...(transactionId ? { transaction_id: transactionId } : {}),
  });
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

export function trackInitiateCheckout(value: number, currency = "GBP") {
  trackEvent("InitiateCheckout", {
    value,
    currency,
  });
}

export function trackViewContent(contentName: string, value?: number, currency = "GBP") {
  trackEvent("ViewContent", {
    content_name: contentName,
    ...(value ? { value, currency } : {}),
  });
}
