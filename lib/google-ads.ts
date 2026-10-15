import { supabaseAdmin } from "@/lib/supabase";

// Google Ads credentials live in site_content (set from /dashboard/ads Google tab)
const KEYS = [
  "google_ads_client_id",
  "google_ads_client_secret",
  "google_ads_dev_token",
  "google_ads_customer_id",
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
  const res = await fetch(`https://googleads.googleapis.com/v18/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "developer-token": cfg.google_ads_dev_token!,
    },
    body: JSON.stringify({ query: gaql }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Google Ads query failed");
  return json.results || [];
}

// Which ad accounts the connected Google user can see (called during connect)
export async function listAccessibleCustomers(accessToken: string, devToken: string): Promise<string[]> {
  const res = await fetch("https://googleads.googleapis.com/v18/customers:listAccessibleCustomers", {
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": devToken },
  });
  const json = await res.json();
  return (json.resourceNames || []).map((r: string) => r.replace("customers/", ""));
}
