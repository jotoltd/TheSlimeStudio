import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

type MetaAction = { action_type: string; value: string };
type InsightRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: MetaAction[];
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  date_start?: string;
  date_stop?: string;
};

function countPurchases(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  return actions
    .filter((a) => a.action_type === "purchase" || a.action_type.includes("fb_pixel_purchase") || a.action_type === "omni_purchase")
    .reduce((s, a) => s + Number(a.value), 0);
}

function landingPageViews(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  const a = actions.find((a) => a.action_type === "landing_page_view");
  return a ? Number(a.value) : 0;
}

async function metaInsights(token: string, accountId: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${accountId}/insights?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return (json.data || []) as InsightRow[];
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metaToken = process.env.META_ADS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID || "act_1408400061198101";
  if (!metaToken) return NextResponse.json({ configured: false });

  const fields = "spend,impressions,reach,clicks,actions";

  let metaError: string | null = null;
  const safe = (p: Promise<InsightRow[]>) => p.catch((e) => { metaError = e.message; return [] as InsightRow[]; });

  const [today, week, month, campaigns, adsets, ads] = await Promise.all([
    safe(metaInsights(metaToken, accountId, { fields, date_preset: "today" })),
    safe(metaInsights(metaToken, accountId, { fields, date_preset: "last_7d" })),
    safe(metaInsights(metaToken, accountId, { fields, date_preset: "last_30d" })),
    safe(metaInsights(metaToken, accountId, { level: "campaign", fields: `campaign_name,${fields}`, date_preset: "last_30d" })),
    safe(metaInsights(metaToken, accountId, { level: "adset", fields: `adset_name,${fields}`, date_preset: "last_30d" })),
    safe(metaInsights(metaToken, accountId, { level: "ad", fields: `ad_name,${fields}`, date_preset: "last_30d" })),
  ]);

  const summarize = (rows: InsightRow[]) => ({
    spend: rows.reduce((s, r) => s + Number(r.spend || 0), 0),
    impressions: rows.reduce((s, r) => s + Number(r.impressions || 0), 0),
    reach: rows.reduce((s, r) => s + Number(r.reach || 0), 0),
    clicks: rows.reduce((s, r) => s + Number(r.clicks || 0), 0),
    lpv: rows.reduce((s, r) => s + landingPageViews(r.actions), 0),
    purchases: rows.reduce((s, r) => s + countPurchases(r.actions), 0),
  });

  // Real bookings attributed to ads, from our own DB
  const { data: adBookings } = await supabaseAdmin
    .from("bookings")
    .select("id, name, email, date, time_slot, total_price, payment_status, notes, created_at")
    .ilike("notes", "[Ad:%")
    .order("created_at", { ascending: false })
    .limit(50);

  const attributedRevenue = (adBookings || [])
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.total_price), 0);

  return NextResponse.json({
    configured: true,
    metaError,
    summary: {
      today: summarize(today),
      week: summarize(week),
      month: summarize(month),
    },
    campaigns: campaigns.map((r) => ({ name: r.campaign_name, ...summarize([r]) })),
    adsets: adsets.map((r) => ({ name: r.adset_name, ...summarize([r]) })),
    ads: ads.map((r) => ({ name: r.ad_name, ...summarize([r]) })),
    adBookings: adBookings || [],
    attributedRevenue,
  });
}
