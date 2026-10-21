import { supabaseAdmin } from "@/lib/supabase";

// Google Ads API versions get sunset — keep this on a currently-supported one
// (v22 sunset ~Oct 2026; v26 is supported until Nov 2027)
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v26";

// The site's canonical origin. NEXT_PUBLIC_SITE_URL wins when set; otherwise
// fall back to the site's canonical domain.
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://theslimestudio.co.uk").replace(/\/+$/, "");
}

// OAuth redirect URI. Google requires an exact match against what's registered
// in Cloud Console, so this must be the canonical origin — not whatever host
// the admin happened to load the dashboard on.
export function googleAdsRedirectUri(): string {
  return `${siteOrigin()}/api/admin/google-ads/callback`;
}

// Google Ads credentials live in site_content (set from /dashboard/ads Google tab)
const KEYS = [
  "google_ads_client_id",
  "google_ads_client_secret",
  "google_ads_dev_token",
  "google_ads_customer_id",
  "google_ads_login_customer_id",
  "google_ads_refresh_token",
] as const;

export type GoogleAdsConfig = Partial<Record<(typeof KEYS)[number], string>>;

let _cfgCache: { at: number; cfg: GoogleAdsConfig } | null = null;

export async function googleAdsConfig(): Promise<GoogleAdsConfig> {
  if (!_cfgCache || Date.now() - _cfgCache.at > 30_000) {
    const { data } = await supabaseAdmin.from("site_content").select("key, value").in("key", [...KEYS]);
    const cfg: GoogleAdsConfig = {};
    (data || []).forEach((r: { key: string; value: string }) => {
      if (r.value?.trim()) cfg[r.key as (typeof KEYS)[number]] = r.value;
    });
    _cfgCache = { at: Date.now(), cfg };
  }
  return _cfgCache.cfg;
}

export function clearGoogleAdsConfigCache() {
  _cfgCache = null;
}

export function googleAdsReady(cfg: GoogleAdsConfig): boolean {
  return !!(cfg.google_ads_client_id && cfg.google_ads_client_secret && cfg.google_ads_dev_token && cfg.google_ads_customer_id && cfg.google_ads_refresh_token);
}

// Exchange the stored refresh token for a short-lived access token.
// Exported because the same Google OAuth grant also covers GA4/Data Manager.
export async function googleAccessToken(cfg: GoogleAdsConfig): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.google_ads_client_id!,
      client_secret: cfg.google_ads_client_secret!,
      refresh_token: cfg.google_ads_refresh_token!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(json.error_description || "Google token refresh failed");
  return json.access_token;
}

// Run a GAQL query against the customer account
export async function googleAdsQuery(gaql: string): Promise<Record<string, unknown>[]> {
  const cfg = await googleAdsConfig();
  if (!googleAdsReady(cfg)) return [];
  const token = await googleAccessToken(cfg);
  const cid = cfg.google_ads_customer_id!.replace(/-/g, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "developer-token": cfg.google_ads_dev_token!,
  };
  // Required when the developer token belongs to a Manager (MCC) account
  if (cfg.google_ads_login_customer_id) {
    headers["login-customer-id"] = cfg.google_ads_login_customer_id.replace(/-/g, "");
  }
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: gaql }),
  });
  const text = await res.text();
  let json: { error?: { message?: string }; results?: Record<string, unknown>[] };
  try { json = JSON.parse(text); } catch {
    throw new Error(`Google Ads API returned HTTP ${res.status} (not JSON): ${text.slice(0, 160)}`);
  }
  if (json.error) throw new Error(json.error.message || "Google Ads query failed");
  return json.results || [];
}

// Which ad accounts the connected Google user can see (called during connect)
export async function listAccessibleCustomers(accessToken: string, devToken: string): Promise<string[]> {
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": devToken },
  });
  const json = await res.json();
  return (json.resourceNames || []).map((r: string) => r.replace("customers/", ""));
}

// --- Offline click conversions ---------------------------------------------
//
// The browser-side gtag conversion is consent-gated and often blocked, so
// Google Ads was reporting 0 conversions despite real ad-attributed sales.
// Instead we store the raw gclid with the booking and upload a click
// conversion server-side once payment is confirmed.
//
// The gclid travels through the booking/notes field as a `[gclid:...]` tag.

export function sanitizeGclid(gclid: unknown): string | null {
  if (typeof gclid !== "string") return null;
  const clean = gclid.replace(/[^A-Za-z0-9_.\-]/g, "").slice(0, 255);
  return clean || null;
}

// Append the click id to an ad-source note: "[Ad: Google Ad] [gclid:AbC...]"
export function withGclidTag(notes: string | null | undefined, gclid: unknown): string | null {
  const tag = sanitizeGclid(gclid);
  const base = notes || "";
  return [base, tag ? `[gclid:${tag}]` : null].filter(Boolean).join(" ") || null;
}

export function gclidFromNotes(notes: string | null | undefined): string | null {
  // Last match wins — withGclidTag appends the real click id at the end, so a
  // crafted [gclid:...] inside an attacker-controlled adSource can't shadow it.
  const m = notes?.match(/\[gclid:([A-Za-z0-9_.\-]+)\](?![\s\S]*\[gclid:)/);
  return m?.[1] || null;
}

// adSource is client-controlled — only accept the "[Ad: ...]" shape the tracker
// writes and cap it so it can't blow up notes or Stripe metadata consumers.
export function sanitizeAdSource(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("[Ad:") ? value.slice(0, 500) : null;
}

// Stripe metadata values cap at 500 chars. Truncate an over-long notes string
// but keep the trailing [gclid:...] tag whole — the webhook restores notes
// from this metadata and reads the click id back out of it.
export function notesForStripeMetadata(notes: string | null | undefined): string {
  const n = notes || "";
  if (n.length <= 500) return n;
  const tag = n.match(/\s*\[gclid:[^\]]*\]\s*$/)?.[0] || "";
  // A tag longer than the limit can't be preserved whole — a truncated one
  // won't parse as a gclid anyway, so the final slice is just the hard cap.
  return (n.slice(0, Math.max(0, 500 - tag.length)).trimEnd() + tag).slice(0, 500);
}

// Uploads a Purchase conversion attributed to the stored click via the Data
// Manager API (new accounts aren't allowlisted for the legacy
// UploadClickConversions service). Requires the OAuth token to have been
// granted the `datamanager` scope — see the connect route.
//
// The destination is the UPLOAD_CLICKS "import" conversion action (the web
// gtag action is secondary so consenting visitors aren't double-counted).
export async function uploadClickConversion(opts: {
  gclid: string;
  value: number;
  orderId: string;
  currencyCode?: string;
}): Promise<boolean> {
  try {
    const cfg = await googleAdsConfig();
    if (!googleAdsReady(cfg) || !opts.gclid) return false;
    const cid = cfg.google_ads_customer_id!.replace(/-/g, "");

    // Find the enabled UPLOAD_CLICKS purchase action — the import destination
    const actions = await googleAdsQuery(
      `SELECT conversion_action.id, conversion_action.name, conversion_action.primary_for_goal
       FROM conversion_action
       WHERE conversion_action.category = 'PURCHASE' AND conversion_action.type = 'UPLOAD_CLICKS' AND conversion_action.status = 'ENABLED'`
    );
    const found = actions
      .map((r) => r.conversionAction as { id?: string; primaryForGoal?: boolean } | undefined)
      .filter((a): a is { id?: string; primaryForGoal?: boolean } => !!a?.id);
    if (found.length === 0) {
      console.error("[google-ads] no enabled UPLOAD_CLICKS purchase action — create one in Google Ads (Goals > Import from clicks)");
      return false;
    }
    const action = found.find((a) => a.primaryForGoal) || found[0];

    const token = await googleAccessToken(cfg);
    const res = await fetch("https://datamanager.googleapis.com/v1/events:ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        destinations: [
          {
            operatingAccount: { accountType: "GOOGLE_ADS", accountId: cid },
            ...(cfg.google_ads_login_customer_id
              ? { loginAccount: { accountType: "GOOGLE_ADS", accountId: cfg.google_ads_login_customer_id.replace(/-/g, "") } }
              : {}),
            productDestinationId: String(action.id),
          },
        ],
        events: [
          {
            eventSource: "WEB",
            eventTimestamp: new Date().toISOString(),
            transactionId: opts.orderId,
            conversionValue: opts.value,
            currency: opts.currencyCode || "GBP",
            adIdentifiers: { gclid: opts.gclid },
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[google-ads] conversion ingest failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[google-ads] conversion ingest error:", e);
    return false;
  }
}
