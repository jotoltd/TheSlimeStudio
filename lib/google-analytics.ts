import { supabaseAdmin } from "@/lib/supabase";
import { googleAdsConfig, googleAdsReady, googleAccessToken } from "@/lib/google-ads";

// GA4 backend access rides on the same Google OAuth connection as Google Ads —
// the refresh token just needs the `analytics.readonly` scope (see the
// google-ads connect route).
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";

const GA_MEASUREMENT_ID = "G-QWN7QR5WH9";

let _pidCache: { at: number; id: string | null } | null = null;

// Find the numeric GA4 property id that owns our measurement id — either from
// a site_content override or by listing data streams on every property the
// connected account can see.
export async function ga4PropertyId(token: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "ga4_property_id")
    .single();
  const override = data?.value?.trim();
  if (override) return override.replace(/^properties\//, "");

  if (_pidCache && Date.now() - _pidCache.at < 3600_000) return _pidCache.id;

  try {
    const res = await fetch(`${ADMIN_API}/accountSummaries?pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const properties: { property: string }[] = (json.accountSummaries || [])
      .flatMap((a: any) => a.propertySummaries || [])
      .map((p: any) => ({ property: p.property }));

    for (const p of properties) {
      const streams = await fetch(`${ADMIN_API}/${p.property}/dataStreams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sj = await streams.json();
      const hit = (sj.dataStreams || []).find(
        (s: any) => s.webStreamData?.measurementId === GA_MEASUREMENT_ID
      );
      if (hit) {
        const id = p.property.replace("properties/", "");
        _pidCache = { at: Date.now(), id };
        return id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

type Ga4Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

async function runReport(
  propertyId: string,
  token: string,
  body: Record<string, unknown>
): Promise<Ga4Row[]> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "GA4 report failed");
  return json.rows || [];
}

// Whole-site analytics for a reporting window — sessions/users/pageviews plus
// GA4 ecommerce purchases, split by channel and top pages.
export async function ga4Analytics(since: string, until: string) {
  const cfg = await googleAdsConfig();
  if (!googleAdsReady(cfg)) return { connected: false };
  try {
    const token = await googleAccessToken(cfg);
    const propertyId = await ga4PropertyId(token);
    if (!propertyId) {
      return { connected: false, error: `No GA4 property found owning ${GA_MEASUREMENT_ID}` };
    }

    const dateRanges = [{ startDate: since, endDate: until }];
    const [totals, daily, channels, pages] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges,
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "screenPageViews" },
          { name: "ecommercePurchases" },
          { name: "purchaseRevenue" },
          { name: "bounceRate" },
        ],
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }, { name: "purchaseRevenue" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }, { name: "purchaseRevenue" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    ]);

    const t = totals[0]?.metricValues || [];
    return {
      connected: true,
      propertyId,
      sessions: Number(t[0]?.value || 0),
      users: Number(t[1]?.value || 0),
      newUsers: Number(t[2]?.value || 0),
      pageViews: Number(t[3]?.value || 0),
      purchases: Number(t[4]?.value || 0),
      purchaseRevenue: Number(t[5]?.value || 0),
      bounceRate: Number(t[6]?.value || 0),
      daily: daily.map((r) => ({
        date: r.dimensionValues?.[0]?.value || "",
        sessions: Number(r.metricValues?.[0]?.value || 0),
        purchases: Number(r.metricValues?.[1]?.value || 0),
        revenue: Number(r.metricValues?.[2]?.value || 0),
      })),
      channels: channels.map((r) => ({
        channel: r.dimensionValues?.[0]?.value || "",
        sessions: Number(r.metricValues?.[0]?.value || 0),
        purchases: Number(r.metricValues?.[1]?.value || 0),
        revenue: Number(r.metricValues?.[2]?.value || 0),
      })),
      topPages: pages.map((r) => ({
        path: r.dimensionValues?.[0]?.value || "",
        views: Number(r.metricValues?.[0]?.value || 0),
        users: Number(r.metricValues?.[1]?.value || 0),
      })),
    };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}
