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

// ─── SumUp payment verification ───

export type SumUpVerifyResult = {
  paid: boolean;
  /** Amount actually captured, in major units (e.g. 15.00). Null when unknown. */
  amount: number | null;
  /** Where the confirmation came from — useful for log forensics. */
  source: "checkout" | "transaction-history" | "none";
  /** True when neither lookup could find any record of the reference at all. */
  notFound: boolean;
};

/**
 * Verify that a SumUp checkout reference was actually paid.
 *
 * SumUp exposes two sources of truth and neither alone is sufficient:
 *
 *  1. `GET /v0.1/checkouts?checkout_reference=X` — only reliable while the
 *     checkout is still live. Completed checkouts are purged after a period,
 *     after which this returns `[]` even for successfully paid references.
 *  2. `GET /v0.1/me/transactions/history` — retains settled transactions long
 *     term, but records the reference as `<checkout_reference>-<suffix>`
 *     (SumUp appends a per-transaction suffix), so it must be prefix-matched.
 *
 * We try (1) first because it is cheap and exact, then fall back to (2). This
 * is what allows a late confirmation or a replayed webhook to still succeed.
 */
export async function verifySumUpPayment(checkoutRef: string): Promise<SumUpVerifyResult> {
  const key = getSumUpKey();
  if (!key || !checkoutRef) {
    return { paid: false, amount: null, source: "none", notFound: true };
  }

  let sawCheckoutRecord = false;

  // 1) Live checkout lookup
  try {
    const res = await fetch(
      `https://api.sumup.com/v0.1/checkouts?checkout_reference=${encodeURIComponent(checkoutRef)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (res.ok) {
      const data = await res.json();
      const checkout = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (checkout) {
        sawCheckoutRecord = true;
        if (String(checkout.status).toUpperCase() === "PAID") {
          const amt = typeof checkout.amount === "number" ? checkout.amount : null;
          return { paid: true, amount: amt, source: "checkout", notFound: false };
        }
      }
    }
  } catch (e) {
    console.error("[sumup-verify] checkout lookup failed:", e);
  }

  // 2) Transaction history fallback (prefix match on payment_reference)
  try {
    const res = await fetch(
      "https://api.sumup.com/v0.1/me/transactions/history?limit=200",
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (res.ok) {
      const data = await res.json();
      const items: Array<Record<string, unknown>> = Array.isArray(data)
        ? data
        : Array.isArray((data as { items?: unknown }).items)
          ? ((data as { items: Array<Record<string, unknown>> }).items)
          : [];

      for (const t of items) {
        const ref = String(t.payment_reference || t.client_transaction_id || "");
        // SumUp appends "-<suffix>" to the reference on the transaction record.
        if (ref !== checkoutRef && !ref.startsWith(`${checkoutRef}-`)) continue;
        sawCheckoutRecord = true;
        if (String(t.status).toUpperCase() === "SUCCESSFUL") {
          const amt = typeof t.amount === "number" ? t.amount : Number(t.amount) || null;
          return { paid: true, amount: amt, source: "transaction-history", notFound: false };
        }
      }
    }
  } catch (e) {
    console.error("[sumup-verify] transaction history lookup failed:", e);
  }

  return { paid: false, amount: null, source: "none", notFound: !sawCheckoutRecord };
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
