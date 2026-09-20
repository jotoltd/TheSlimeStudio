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
  frequency?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  video_play_actions?: MetaAction[];
  video_p100_watched_actions?: MetaAction[];
  video_avg_time_watched_actions?: MetaAction[];
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
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

  const fields = "spend,impressions,reach,clicks,actions,action_values,frequency";
  const adLevelFields = `${fields},video_play_actions,video_p100_watched_actions,video_avg_time_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking`;

  // Previous 7-day window for week-over-week comparisons
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const now = new Date();
  const prevSince = fmtDate(new Date(now.getTime() - 14 * 86400000));
  const prevUntil = fmtDate(new Date(now.getTime() - 8 * 86400000));
  let metaError: string | null = null;
  const safe = <T,>(p: Promise<T[]>) => p.catch((e) => { metaError = e.message; return [] as T[]; });

  const [today, week, prevWeek, month, campaigns, adsets, ads, daily, byAgeGender, byRegion, byPlacement, byDevice, attribution, manageCampaigns, manageAdsets, adCreatives] = await Promise.all([
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "today" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "last_7d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, time_range: JSON.stringify({ since: prevSince, until: prevUntil }) }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "campaign", fields: `campaign_name,${fields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "adset", fields: `adset_name,${fields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { level: "ad", fields: `ad_name,${adLevelFields}`, date_preset: "last_30d" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `spend,clicks,actions`, date_preset: "last_30d", time_increment: "1" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,reach,spend,actions`, date_preset: "last_30d", breakdowns: "age,gender" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,reach,spend`, date_preset: "last_30d", breakdowns: "region" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,clicks,spend,actions`, date_preset: "last_30d", breakdowns: "publisher_platform,platform_position" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `impressions,clicks,actions`, date_preset: "last_30d", breakdowns: "impression_device" }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/insights`, { fields: `actions,action_values`, date_preset: "last_30d", action_attribution_windows: '["1d_view","7d_click"]' }) as Promise<InsightRow[]>),
    safe(metaGet(metaToken, `${accountId}/campaigns`, { fields: "name,status,effective_status,daily_budget,objective" })),
    safe(metaGet(metaToken, `${accountId}/adsets`, { fields: "name,status,effective_status,daily_budget,campaign{name},targeting,optimization_goal,promoted_object" })),
    safe(metaGet(metaToken, `${accountId}/ads`, { fields: "name,status,effective_status,issues_info,creative{thumbnail_url,object_story_spec,effective_object_story_id,effective_instagram_media_id,instagram_permalink_url}" })),
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
    purchaseValue: rows.reduce((s, r) => s + Number(r.action_values?.find((a) => a.action_type === "purchase")?.value || 0), 0),
    frequency: rows.length ? rows.reduce((s, r) => s + Number(r.frequency || 0), 0) / rows.length : 0,
  });

  const actVal = (list: MetaAction[] | undefined, type: string) => {
    const a = list?.find((x) => x.action_type === type);
    return a ? Number(a.value) : 0;
  };

  // Meta's plain-English ad grades
  const rankLabel = (r?: string) => {
    if (!r || r === "UNKNOWN") return null;
    if (r.startsWith("ABOVE_AVERAGE")) return { text: "Above average", good: true };
    if (r === "AVERAGE") return { text: "Average", good: true };
    if (r.startsWith("BELOW_AVERAGE")) return { text: "Below average", good: false };
    return null;
  };

  // Click-through vs view-through purchases (explains Meta vs DB count gaps)
  const attrPurchase = (attribution as any[])[0]?.actions?.find((a: any) => a.action_type === "purchase") || {};
  const attributionSplit = {
    clicked: Number(attrPurchase["7d_click"] || 0),
    sawOnly: Number(attrPurchase["1d_view"] || 0),
  };

  const weekSummary = summarize(week);
  const prevWeekSummary = summarize(prevWeek);
  const deltas = {
    spend: prevWeekSummary.spend ? (weekSummary.spend - prevWeekSummary.spend) / prevWeekSummary.spend : null,
    clicks: prevWeekSummary.clicks ? (weekSummary.clicks - prevWeekSummary.clicks) / prevWeekSummary.clicks : null,
    purchases: prevWeekSummary.purchases ? weekSummary.purchases - prevWeekSummary.purchases : null,
  };

  // Ad creative previews — what customers actually see
  const adPreviews = (adCreatives as any[]).map((ad) => {
    const spec = ad.creative?.object_story_spec || {};
    const vd = spec.video_data || {};
    const ld = spec.link_data || {};
    return {
      name: ad.name,
      status: ad.effective_status,
      thumbnail: ad.creative?.thumbnail_url || null,
      kind: vd.video_id ? "video" : "image",
      headline: vd.title || ld.name || null,
      body: vd.message || ld.message || null,
      link: vd.call_to_action?.value?.link || ld.link || null,
    };
  });

  // Smart alerts — surface problems without needing to check
  const alerts: { level: "warning" | "info"; message: string }[] = [];
  for (const ad of adCreatives as any[]) {
    if (["PENDING_REVIEW", "IN_PROCESS"].includes(ad.effective_status)) {
      alerts.push({ level: "info", message: `"${ad.name}" is waiting for Meta's review.` });
    }
    if (["DISAPPROVED", "WITH_ISSUES"].includes(ad.effective_status)) {
      alerts.push({ level: "warning", message: `"${ad.name}" has a problem — check it in Ads Manager.` });
    }
    const issue = (ad.issues_info || [])[0];
    if (issue && issue.level === "ERROR") {
      alerts.push({ level: "warning", message: `Delivery issue on "${ad.name}": ${issue.error_summary || issue.error_message || "check Ads Manager"}.` });
    }
  }
  for (const a of ads as any[]) {
    if (a.conversion_rate_ranking?.startsWith("BELOW_AVERAGE")) {
      alerts.push({ level: "info", message: `Meta rates "${a.ad_name}" below average for turning clicks into bookings — consider testing new copy or a different audience.` });
    }
  }
  for (const c of manageCampaigns as any[]) {
    if (c.status === "PAUSED") alerts.push({ level: "info", message: `Campaign "${c.name}" is paused — your ads aren't running.` });
  }
  if (weekSummary.frequency > 3.5) {
    alerts.push({ level: "warning", message: `Ad fatigue: people are seeing your ads ${weekSummary.frequency.toFixed(1)}× on average this week — time for fresh creative.` });
  }
  if (weekSummary.spend > 10 && weekSummary.purchases === 0) {
    alerts.push({ level: "warning", message: `£${weekSummary.spend.toFixed(2)} spent this week with no attributed bookings — review the ads or landing page.` });
  }

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
      week: weekSummary,
      prevWeek: prevWeekSummary,
      month: summarize(month),
    },
    deltas,
    adPreviews,
    alerts,
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
    ads: ads.map((r) => {
      const plays = actVal(r.video_play_actions, "video_view");
      const completes = actVal(r.video_p100_watched_actions, "video_view");
      const avgWatch = actVal(r.video_avg_time_watched_actions, "video_view");
      const rank = rankLabel(r.conversion_rate_ranking);
      return {
        name: r.ad_name,
        thumbnail: thumbnailByAdName[r.ad_name || ""] || null,
        ...summarize([r]),
        quality: rank?.text || null,
        qualityGood: rank?.good ?? null,
        video: plays > 0 ? { plays, completionRate: Math.round((completes / plays) * 100), avgWatch } : null,
      };
    }),
    attributionSplit,
    devices: (byDevice as any[]).map((r) => ({
      device: r.impression_device,
      impressions: Number(r.impressions || 0),
      clicks: Number(r.clicks || 0),
      purchases: countPurchases(r.actions),
    })).sort((a, b) => b.impressions - a.impressions),
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
