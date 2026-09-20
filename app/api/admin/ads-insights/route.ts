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
  // Meta reports the same conversion under several action types
  // (purchase, omni_purchase, fb_pixel_purchase, onsite_web_purchase...).
  // "purchase" is the canonical attributed count — use it alone or we
  // triple-count every conversion.
  const a = actions.find((a) => a.action_type === "purchase");
  return a ? Number(a.value) : 0;
}

function landingPageViews(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  const a = actions.find((a) => a.action_type === "landing_page_view");
  return a ? Number(a.value) : 0;
}

// Turns Meta's targeting JSON into "Holt +25mi · ages 18–65 · Parenting, Family Day"
function describeTargeting(t: any): string {
  if (!t) return "";
  const parts: string[] = [];
  const geo = t.geo_locations;
  if (geo?.cities?.length) {
    const c = geo.cities[0];
    const miles = c.distance_unit === "kilometer" ? Math.round(Number(c.radius) * 0.621371) : c.radius;
    parts.push(`${c.name || "Custom area"} +${miles}mi`);
  } else if (geo?.countries?.length) {
    parts.push(geo.countries.includes("GB") ? "All UK" : geo.countries.join(", "));
  }
  if (t.age_min || t.age_max) parts.push(`ages ${t.age_min || 18}–${t.age_max || "65+"}`);
  const interests = (t.flexible_spec || []).flatMap((s: any) => s.interests || []).map((i: any) => i.name);
  if (interests.length) parts.push(interests.join(", "));
  return parts.join(" · ");
}

function checkAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  return !!(token && verifyToken(token));
}

async function metaGet(token: string, path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.data || [];
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metaToken = process.env.META_ADS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID || "act_1408400061198101";
  if (!metaToken) return NextResponse.json({ configured: false });

  const fields = "spend,impressions,reach,clicks,actions";
  let metaError: string | null = null;
  const safe = <T,>(p: Promise<T[]>) => p.catch((e) => { metaError = e.message; return [] as T[]; });

  const [today, week, month, campaigns, adsets, ads, daily, byAgeGender, byRegion, byPlacement, manageCampaigns, manageAdsets, adCreatives] = await Promise.all([
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "today" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "last_7d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "campaign", fields: `campaign_name,${fields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "adset", fields: `adset_name,${fields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "ad", fields: `ad_name,${fields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `spend,clicks,actions`, date_preset: "last_30d", time_increment: "1" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,reach,spend,actions`, date_preset: "last_30d", breakdowns: "age,gender" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,reach,spend`, date_preset: "last_30d", breakdowns: "region" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,clicks,spend,actions`, date_preset: "last_30d", breakdowns: "publisher_platform,platform_position" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/campaigns`, { fields: "name,status,effective_status,daily_budget,objective" })),
    safe(metaGet(metaToken, `${accountId}/adsets`, { fields: "name,status,effective_status,daily_budget,campaign{name},targeting,optimization_goal,promoted_object" })),
    safe(metaGet(metaToken, `${accountId}/ads`, { fields: "name,status,effective_status,creative{thumbnail_url,effective_object_story_id,effective_instagram_media_id,instagram_permalink_url}" })),
  ]);

  // Comments left on the ads — FB post comments need a Page token; IG media
  // comments work with the system user token directly.
  const comments: { adName: string; platform: string; author: string; text: string; time: string; replyUrl: string | null }[] = [];
  let fbCommentsUnavailable = false;
  for (const ad of adCreatives as any[]) {
    const cr = ad.creative || {};
    if (cr.effective_instagram_media_id) {
      try {
        const igComments = await metaGet(metaToken, `${cr.effective_instagram_media_id}/comments`, { fields: "text,username,timestamp", limit: "25" });
        for (const cm of igComments as any[]) {
          comments.push({ adName: ad.name, platform: "Instagram", author: cm.username || "?", text: cm.text || "", time: cm.timestamp || "", replyUrl: cr.instagram_permalink_url || null });
        }
      } catch {}
    }
    if (cr.effective_object_story_id) {
      try {
        const pageId = cr.effective_object_story_id.split("_")[0];
        const ptRes = await fetch(`${GRAPH}/${pageId}?${new URLSearchParams({ fields: "access_token", access_token: metaToken })}`, { cache: "no-store" });
        const pt = await ptRes.json();
        const pageToken = pt.access_token;
        if (!pageToken) throw new Error("no page token");
        const qs = new URLSearchParams({ fields: "message,from{name},created_time", limit: "25", access_token: pageToken });
        const res = await fetch(`${GRAPH}/${cr.effective_object_story_id}/comments?${qs}`, { cache: "no-store" });
        const json = await res.json();
        for (const cm of json.data || []) {
          comments.push({ adName: ad.name, platform: "Facebook", author: cm.from?.name || "?", text: cm.message || "", time: cm.created_time || "", replyUrl: `https://www.facebook.com/${cr.effective_object_story_id}` });
        }
      } catch {
        fbCommentsUnavailable = true;
      }
    }
  }
  comments.sort((a, b) => (b.time || "").localeCompare(a.time || ""));

  const summarize = (rows: InsightRow[]) => ({
    spend: rows.reduce((s, r) => s + Number(r.spend || 0), 0),
    impressions: rows.reduce((s, r) => s + Number(r.impressions || 0), 0),
    reach: rows.reduce((s, r) => s + Number(r.reach || 0), 0),
    clicks: rows.reduce((s, r) => s + Number(r.clicks || 0), 0),
    lpv: rows.reduce((s, r) => s + landingPageViews(r.actions), 0),
    purchases: rows.reduce((s, r) => s + countPurchases(r.actions), 0),
  });

  const thumbnailByAdName: Record<string, string> = {};
  for (const ad of adCreatives as any[]) {
    const thumb = ad.creative?.thumbnail_url;
    if (ad.name && thumb) thumbnailByAdName[ad.name] = thumb;
  }

  // Real bookings attributed to ads, from our own DB — sessions + special events
  const [{ data: adBookings }, { data: adEventBookings }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, name, email, date, time_slot, total_price, payment_status, notes, created_at")
      .ilike("notes", "[Ad:%")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("special_event_bookings")
      .select("id, name, email, quantity, total_price, payment_status, notes, created_at")
      .ilike("notes", "[Ad:%")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const allAdBookings = [
    ...(adBookings || []).map((b) => ({ ...b, kind: "session" as const })),
    ...(adEventBookings || []).map((b) => ({ ...b, date: b.created_at, kind: "event" as const })),
  ].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const attributedRevenue = allAdBookings
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
    daily: daily.map((r) => ({
      date: r.date_start,
      spend: Number(r.spend || 0),
      clicks: Number(r.clicks || 0),
      purchases: countPurchases(r.actions),
    })),
    audience: {
      ageGender: (byAgeGender as any[]).map((r) => ({
        age: r.age, gender: r.gender,
        impressions: Number(r.impressions || 0),
        reach: Number(r.reach || 0),
        spend: Number(r.spend || 0),
        purchases: countPurchases(r.actions),
      })).sort((a, b) => b.impressions - a.impressions),
      regions: (byRegion as any[]).map((r) => ({
        region: r.region,
        impressions: Number(r.impressions || 0),
        reach: Number(r.reach || 0),
        spend: Number(r.spend || 0),
      })).sort((a, b) => b.impressions - a.impressions).slice(0, 10),
      placements: (byPlacement as any[]).map((r) => ({
        platform: r.publisher_platform, position: r.platform_position,
        impressions: Number(r.impressions || 0),
        clicks: Number(r.clicks || 0),
        spend: Number(r.spend || 0),
        purchases: countPurchases(r.actions),
      })).sort((a, b) => b.impressions - a.impressions),
    },
    campaigns: campaigns.map((r) => ({ name: r.campaign_name, ...summarize([r]) })),
    adsets: adsets.map((r) => ({ name: r.adset_name, ...summarize([r]) })),
    ads: ads.map((r) => ({ name: r.ad_name, thumbnail: thumbnailByAdName[r.ad_name || ""] || null, ...summarize([r]) })),
    manage: {
      campaigns: (manageCampaigns as any[]).map((c) => ({
        id: c.id, name: c.name, status: c.status, effectiveStatus: c.effective_status,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null, objective: c.objective,
      })),
      adsets: (manageAdsets as any[]).map((a) => ({
        id: a.id, name: a.name, status: a.status, effectiveStatus: a.effective_status,
        dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null, campaignName: a.campaign?.name,
        targeting: describeTargeting(a.targeting),
        optimisesFor: a.promoted_object?.custom_event_type || a.optimization_goal || null,
      })),
      ads: (adCreatives as any[]).map((a) => ({
        id: a.id, name: a.name, status: a.status, effectiveStatus: a.effective_status,
        thumbnail: a.creative?.thumbnail_url || null,
      })),
    },
    adBookings: allAdBookings,
    attributedRevenue,
    comments,
    fbCommentsUnavailable,
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metaToken = process.env.META_ADS_TOKEN;
  if (!metaToken) return NextResponse.json({ error: "Ads API not configured" }, { status: 500 });

  const body = await req.json();
  const { id, status, dailyBudget } = body as { id?: string; status?: string; dailyBudget?: number };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const params: Record<string, string> = { access_token: metaToken };
  if (status) {
    if (!["ACTIVE", "PAUSED"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    params.status = status;
  }
  if (dailyBudget != null) {
    if (dailyBudget < 1) return NextResponse.json({ error: "Budget must be at least £1" }, { status: 400 });
    params.daily_budget = String(Math.round(dailyBudget * 100));
  }

  const res = await fetch(`${GRAPH}/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (json.error) return NextResponse.json({ error: json.error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
