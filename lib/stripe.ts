import Stripe from "stripe";

let _stripe: Stripe | null = null;
let _mode: "live" | "test" | null = null;

export type StripeMode = "live" | "test";

export function getStripeMode(): StripeMode {
  const mode = process.env.STRIPE_MODE || "test";
  return mode === "live" ? "live" : "test";
}

export function getStripeKeys() {
  const mode = getStripeMode();
  if (mode === "live") {
    return {
      secretKey: process.env.STRIPE_LIVE_SECRET_KEY || "",
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY || "",
      webhookSecret: process.env.STRIPE_LIVE_WEBHOOK_SECRET || "",
    };
  }
  return {
    secretKey: process.env.STRIPE_TEST_SECRET_KEY || "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET || "",
  };
}

export function getStripe(): Stripe | null {
  const keys = getStripeKeys();
  if (!keys.secretKey) return null;
  if (!_stripe || _mode !== getStripeMode()) {
    _stripe = new Stripe(keys.secretKey);
    _mode = getStripeMode();
  }
  return _stripe;
}

export function getPublishableKey(): string {
  return getStripeKeys().publishableKey;
}
