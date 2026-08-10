import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

let _stripe: Stripe | null = null;
let _mode: "live" | "test" | null = null;
let _cachedMode: "live" | "test" | null = null;
let _modeCacheTime = 0;

export type StripeMode = "live" | "test";

export function getStripeMode(): StripeMode {
  const envMode = process.env.STRIPE_MODE || "test";
  return envMode === "live" ? "live" : "test";
}

export async function getStripeModeAsync(): Promise<StripeMode> {
  // Check cache (valid for 5 seconds)
  const now = Date.now();
  if (_cachedMode && now - _modeCacheTime < 5000) {
    return _cachedMode;
  }
  try {
    const { data } = await supabaseAdmin.from("site_settings").select("stripe_mode").eq("id", 1).single();
    if (data && data.stripe_mode === "live") {
      _cachedMode = "live";
    } else if (data && data.stripe_mode === "test") {
      _cachedMode = "test";
    } else {
      _cachedMode = getStripeMode();
    }
    _modeCacheTime = now;
    return _cachedMode;
  } catch {
    return getStripeMode();
  }
}

export function getStripeKeysForMode(mode: StripeMode) {
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

export async function getStripeAsync(): Promise<Stripe | null> {
  const mode = await getStripeModeAsync();
  const keys = getStripeKeysForMode(mode);
  if (!keys.secretKey) return null;
  if (!_stripe || _mode !== mode) {
    _stripe = new Stripe(keys.secretKey);
    _mode = mode;
  }
  return _stripe;
}

export function getStripe(): Stripe | null {
  const keys = getStripeKeysForMode(getStripeMode());
  if (!keys.secretKey) return null;
  if (!_stripe || _mode !== getStripeMode()) {
    _stripe = new Stripe(keys.secretKey);
    _mode = getStripeMode();
  }
  return _stripe;
}

export async function getPublishableKeyAsync(): Promise<string> {
  const mode = await getStripeModeAsync();
  return getStripeKeysForMode(mode).publishableKey;
}

export function clearStripeModeCache() {
  _cachedMode = null;
  _modeCacheTime = 0;
  _stripe = null;
  _mode = null;
}
