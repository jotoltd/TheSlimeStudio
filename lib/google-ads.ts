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

// Exchange the stored refresh token for a short-lived access token
async function accessToken(cfg: GoogleAdsConfig): Promise<string> {
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
  const token = await accessToken(cfg);
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
  let json: any = null;
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
