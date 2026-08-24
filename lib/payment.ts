import { supabaseAdmin } from "@/lib/supabase";

export type PaymentProvider = "stripe" | "sumup";

let _cachedProvider: PaymentProvider | null = null;
let _providerCacheTime = 0;

export function getDefaultProvider(): PaymentProvider {
  const env = process.env.PAYMENT_PROVIDER || "stripe";
  return env === "sumup" ? "sumup" : "stripe";
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const now = Date.now();
  if (_cachedProvider && now - _providerCacheTime < 5000) {
    return _cachedProvider;
  }
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("payment_provider")
      .eq("id", 1)
      .single();
    if (data && data.payment_provider === "sumup") {
      _cachedProvider = "sumup";
    } else if (data && data.payment_provider === "stripe") {
      _cachedProvider = "stripe";
    } else {
      _cachedProvider = getDefaultProvider();
    }
    _providerCacheTime = now;
    return _cachedProvider;
  } catch {
    return getDefaultProvider();
  }
}

export function clearPaymentProviderCache() {
  _cachedProvider = null;
  _providerCacheTime = 0;
}

// ─── SumUp helpers ───

export type SumUpMode = "live" | "test";

export function getSumUpMode(): SumUpMode {
  const envMode = process.env.SUMUP_MODE || "test";
  return envMode === "live" ? "live" : "test";
}

export function getSumUpKey(): string {
  const mode = getSumUpMode();
  if (mode === "live") {
    return process.env.SUMUP_LIVE_KEY || "";
  }
  return process.env.SUMUP_TEST_KEY || "";
}

export function getSumUpMerchantId(): string {
  return process.env.SUMUP_MERCHANT_ID || "";
}

export function isSumUpConfigured(): boolean {
  return !!getSumUpKey();
}

// ─── Unified checkout result ───

export type CheckoutResult = {
  // For Stripe: returns a URL to redirect to (checkout session)
  // For SumUp: returns a URL to redirect to (SumUp checkout)
  url?: string;
  // For inline Stripe payment: returns clientSecret + publishableKey
  clientSecret?: string;
  paymentIntentId?: string;
  provider: PaymentProvider;
  error?: string;
};
