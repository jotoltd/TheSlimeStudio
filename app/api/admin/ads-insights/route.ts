import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSlotPlaceholder } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { googleAdsQuery, googleAdsConfig, googleAdsReady } from "@/lib/google-ads";
import { META_AD_URL_TAGS, metaPost, metaRead } from "@/lib/meta-ads";
import { classifyBookingSource, bookingSourceLabel, bookingSourceDetail, type BookingSource } from "@/lib/ad-tracking";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

type InsightRow = {
  spend?: string;
  impressions?: string;
  clicks?: string;
  campaign_id?: string;
  campaign_name?: string;
};

type MetaTargeting = {
  geo_locations?: {
    cities?: { name?: string; radius?: string | number; distance_unit?: string }[];
    countries?: string[];
  };
  age_min?: number;
  age_max?: number;
  flexible_spec?: { interests?: { name: string }[] }[];
};

type MetaAd = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  campaign?: { name?: string };
  adset?: { name?: string };
  creative?: {
    id?: string;
    url_tags?: string;
    object_story_spec?: {
      link_data?: { link?: string };
      video_data?: { call_to_action?: { value?: { link?: string } } };
      photo_data?: { call_to_action?: { value?: { link?: string } } };
    };
    asset_feed_spec?: { link_urls?: { website_url?: string }[] };
  };
};

type MetaCampaign = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
};

type MetaAdset = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  campaign?: { name?: string };
  targeting?: MetaTargeting;
  optimization_goal?: string;
  promoted_object?: { custom_event_type?: string };
};

type GadsRow = {
  segments?: { date?: string };
  metrics?: {
    costMicros?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    conversions?: string | number;
  };
  campaign?: { name?: string; status?: string };
  campaignBudget?: { amountMicros?: string | number };
};

// Turns Meta's targeting JSON into "Holt +25mi · ages 18–65 · Parenting, Family Day"
function describeTargeting(t: MetaTargeting | undefined): string {
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
  const interests = (t.flexible_spec || []).flatMap((s) => s.interests || []).map((i) => i.name);
  if (interests.length) parts.push(interests.join(", "));
  return parts.join(" · ");
}

// Where the ad's button actually sends people — link posts store it in
// link_data, video/photo creatives in the call_to_action, dynamic creatives
// in asset_feed_spec. Boosted posts can return nothing (link lives on the post).
function creativeLink(c: MetaAd["creative"]): string | null {
  const spec = c?.object_story_spec;
  return (
    spec?.link_data?.link ||
    spec?.video_data?.call_to_action?.value?.link ||
    spec?.photo_data?.call_to_action?.value?.link ||
    c?.asset_feed_spec?.link_urls?.[0]?.website_url ||
    null
  );
}

// A click only forwards /booking → /go when it carries a paid-click marker.
const PAID_MEDIUM_RE = /utm_medium=(paid|cpc|ppc|paid[-_]?social)/;

function adHealth(a: MetaAd) {
  const tags = a.creative?.url_tags || "";
  return {
    tracked: tags.includes("utm_campaign"),
    paid: PAID_MEDIUM_RE.test(tags),
  };
}

// Merge only the url_tags keys an ad is missing — an ad stamped
// "utm_source=ig&utm_campaign=..." gets just "&utm_medium=paid&..."
// appended rather than a duplicate utm_source.
function mergeUrlTags(existing: string): string {
  const keys = new Set(existing.split("&").map((p) => p.split("=")[0]).filter(Boolean));
  const missing = META_AD_URL_TAGS.split("&").filter((p) => !keys.has(p.split("=")[0]));
  return missing.length ? (existing ? `${existing}&${missing.join("&")}` : missing.join("&")) : existing;
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

  // Selected reporting window — default last 30 days
  const range = req.nextUrl.searchParams.get("range") || "30d";
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const now = new Date();
  const until = fmtDate(now);
  const since = fmtDate(new Date(now.getTime() - (days - 1) * 86400000));

  let metaError: string | null = null;
  const safe = <T,>(p: Promise<T[]>) => p.catch((e) => { metaError = e.message; return [] as T[]; });

  // Meta: one insights row for spend/clicks + the objects needed for the
  // manage list. Only queried when the token is configured — the booking
  // attribution below works either way.
  const [month, metaCampaignStats, manageCampaigns, manageAdsets, adCreatives] = metaToken
    ? await Promise.all([
        safe(metaGet(metaToken, `${accountId}/insights`, { fields: "spend,impressions,clicks", time_range: JSON.stringify({ since, until }) }) as Promise<InsightRow[]>),
        safe(metaGet(metaToken, `${accountId}/insights`, { level: "campaign", fields: "campaign_id,campaign_name,spend,impressions,clicks", time_range: JSON.stringify({ since, until }) }) as Promise<InsightRow[]>),
        safe(metaGet(metaToken, `${accountId}/campaigns`, { fields: "name,status,effective_status,daily_budget" }) as Promise<MetaCampaign[]>),
        safe(metaGet(metaToken, `${accountId}/adsets`, { fields: "name,status,effective_status,daily_budget,campaign{name},targeting,optimization_goal,promoted_object" }) as Promise<MetaAdset[]>),
        safe(metaGet(metaToken, `${accountId}/ads`, { fields: "name,status,effective_status,campaign{name},adset{name},creative{url_tags,object_story_spec,asset_feed_spec}" }) as Promise<MetaAd[]>),
      ])
    : [[], [], [], [], []] as [InsightRow[], InsightRow[], MetaCampaign[], MetaAdset[], MetaAd[]];

  const meta = metaToken
    ? {
        spend: month.reduce((s, r) => s + Number(r.spend || 0), 0),
        impressions: month.reduce((s, r) => s + Number(r.impressions || 0), 0),
        clicks: month.reduce((s, r) => s + Number(r.clicks || 0), 0),
      }
    : null;

  // Google Ads — live account stats, only when the API connection is set up
  const gadsCfg = await googleAdsConfig();
  const gadsConnected = googleAdsReady(gadsCfg);
  let gadsApiError: string | null = null;
  const gadsQuery = (q: string) =>
    (gadsConnected ? googleAdsQuery(q) : Promise.resolve([])).catch((e) => { gadsApiError = e.message; return [] as Record<string, unknown>[]; });
  const [gadsDaily, gadsCampaigns] = await Promise.all([
    gadsQuery(`SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'`),
    gadsQuery(`SELECT campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'`),
  ]);
  const gadsMicros = (v: unknown) => Number(v || 0) / 1_000_000;
  const google = {
    connected: gadsConnected,
    error: gadsApiError,
    spend: (gadsDaily as GadsRow[]).reduce((s, r) => s + gadsMicros(r.metrics?.costMicros), 0),
    impressions: (gadsDaily as GadsRow[]).reduce((s, r) => s + Number(r.metrics?.impressions || 0), 0),
    clicks: (gadsDaily as GadsRow[]).reduce((s, r) => s + Number(r.metrics?.clicks || 0), 0),
    conversions: (gadsDaily as GadsRow[]).reduce((s, r) => s + Number(r.metrics?.conversions || 0), 0),
    campaigns: (gadsCampaigns as GadsRow[]).map((r) => ({
      name: r.campaign?.name || "Unknown",
      status: r.campaign?.status || "",
      dailyBudget: r.campaignBudget?.amountMicros ? gadsMicros(r.campaignBudget.amountMicros) : null,
      spend: gadsMicros(r.metrics?.costMicros),
      clicks: Number(r.metrics?.clicks || 0),
      conversions: Number(r.metrics?.conversions || 0),
    })),
  };

  // Attribution: every sale in the window, classified once into a single
  // bucket. Meta/Google = real ads; email = campaign links; other = any other
  // tracked link; organic = untagged. One data path — cards and lists can't
  // disagree with each other.
  const [{ data: bookings }, { data: eventBookings }, { data: giftCards }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, name, email, date, people, is_party, total_price, payment_status, notes, stripe_session_id, created_at")
      .gte("created_at", `${since}T00:00:00Z`)
      .lte("created_at", `${until}T23:59:59Z`),
    supabaseAdmin
      .from("special_event_bookings")
      .select("id, name, email, quantity, total_price, payment_status, notes, created_at")
      .gte("created_at", `${since}T00:00:00Z`)
      .lte("created_at", `${until}T23:59:59Z`),
    supabaseAdmin
      .from("gift_cards")
      .select("id, code, purchaser_name, purchaser_email, initial_value, status, ad_source, created_at")
      .gte("created_at", `${since}T00:00:00Z`)
      .lte("created_at", `${until}T23:59:59Z`),
  ]);

  type Item = {
    id: string;
    name: string;
    email: string | null;
    amount: number;
    status: string;
    kind: "Session" | "Event" | "Gift card";
    date: string | null;
    qty: number;
    party: boolean;
    at: string;
    source: BookingSource;
    label: string;
    campaign: string | null;
    adName: string | null;
  };

  // `_slot2` rows are the auto-blocked second hour of 2-hour bookings — not
  // real sales, so they never reach the list or the source totals.
  const items: Item[] = [
    ...(bookings || []).filter((b) => !isSlotPlaceholder(b)).map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      amount: Number(b.total_price || 0),
      status: b.payment_status,
      kind: "Session" as const,
      date: b.date,
      qty: b.people || 1,
      party: !!b.is_party,
      at: b.created_at,
      source: classifyBookingSource(b.notes),
      label: bookingSourceLabel(b.notes),
      campaign: bookingSourceDetail(b.notes).campaign,
      adName: bookingSourceDetail(b.notes).ad,
    })),
    ...(eventBookings || []).map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      amount: Number(b.total_price || 0),
      status: b.payment_status,
      kind: "Event" as const,
      date: null,
      qty: b.quantity || 1,
      party: false,
      at: b.created_at,
      source: classifyBookingSource(b.notes),
      label: bookingSourceLabel(b.notes),
      campaign: bookingSourceDetail(b.notes).campaign,
      adName: bookingSourceDetail(b.notes).ad,
    })),
    ...(giftCards || []).map((g) => ({
      id: g.id,
      name: g.purchaser_name || "Customer",
      email: g.purchaser_email || g.code,
      amount: Number(g.initial_value || 0),
      // Pending cards are unpaid checkouts — they don't count as sales.
      status: g.status === "pending" ? "pending" : g.status === "cancelled" ? "cancelled" : "paid",
      kind: "Gift card" as const,
      date: null,
      qty: 1,
      party: false,
      at: g.created_at,
      source: classifyBookingSource(g.ad_source),
      label: bookingSourceLabel(g.ad_source),
      campaign: bookingSourceDetail(g.ad_source).campaign,
      adName: bookingSourceDetail(g.ad_source).ad,
    })),
  ].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  const sources: Record<BookingSource, { bookings: number; revenue: number }> = {
    meta: { bookings: 0, revenue: 0 },
    google: { bookings: 0, revenue: 0 },
    email: { bookings: 0, revenue: 0 },
    app: { bookings: 0, revenue: 0 },
    other: { bookings: 0, revenue: 0 },
    organic: { bookings: 0, revenue: 0 },
  };
  for (const i of items) {
    if (i.status !== "paid") continue;
    sources[i.source].bookings += 1;
    sources[i.source].revenue += i.amount;
  }

  // Per-campaign view: platform-reported spend/clicks joined by name with the
  // campaign name each tracked sale carries in its [Ad: utm:.../campaign] tag.
  // Meta campaign names join exactly (utm_campaign = {{campaign.name}}).
  // Google bookings only carry a gclid — no campaign name — so Google rows
  // rely on Google's own reported conversions.
  type CampaignRow = {
    source: "meta" | "google";
    name: string;
    status: string | null;
    spend: number | null;
    clicks: number | null;
    platformConversions: number | null;
    sales: number;
    revenue: number;
  };
  const campaignMap = new Map<string, CampaignRow>();
  const campRow = (source: "meta" | "google", name: string): CampaignRow => {
    const key = `${source}|${name.toLowerCase()}`;
    let r = campaignMap.get(key);
    if (!r) {
      r = { source, name, status: null, spend: null, clicks: null, platformConversions: null, sales: 0, revenue: 0 };
      campaignMap.set(key, r);
    }
    return r;
  };
  const metaStatus = new Map(manageCampaigns.map((c) => [(c.name || "").toLowerCase(), c.effective_status || c.status || null]));
  metaCampaignStats.forEach((r) => {
    const name = r.campaign_name || "";
    if (!name) return;
    const e = campRow("meta", name);
    e.spend = (e.spend || 0) + Number(r.spend || 0);
    e.clicks = (e.clicks || 0) + Number(r.clicks || 0);
    e.status = metaStatus.get(name.toLowerCase()) || e.status;
  });
  google.campaigns.forEach((c) => {
    const e = campRow("google", c.name);
    e.spend = (e.spend || 0) + c.spend;
    e.clicks = (e.clicks || 0) + c.clicks;
    e.platformConversions = (e.platformConversions || 0) + c.conversions;
    e.status = c.status || e.status;
  });
  for (const i of items) {
    if (i.status !== "paid" || (i.source !== "meta" && i.source !== "google") || !i.campaign) continue;
    const e = campRow(i.source, i.campaign);
    e.sales += 1;
    e.revenue += i.amount;
  }
  const campaigns = Array.from(campaignMap.values())
    .sort((a, b) => b.revenue - a.revenue || (b.spend || 0) - (a.spend || 0))
    .slice(0, 20);

  return NextResponse.json({
    configured: true,
    metaConfigured: !!metaToken,
    metaError,
    range: { key: range, since, until },
    meta,
    google,
    manage: {
      campaigns: manageCampaigns.map((c) => ({
        id: c.id, name: c.name, status: c.status, effectiveStatus: c.effective_status,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      })),
      adsets: manageAdsets.map((a) => ({
        id: a.id, name: a.name, status: a.status, effectiveStatus: a.effective_status,
        dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null, campaignName: a.campaign?.name,
        targeting: describeTargeting(a.targeting),
        optimisesFor: a.promoted_object?.custom_event_type || a.optimization_goal || null,
      })),
      ads: adCreatives.map((a) => ({
        id: a.id, name: a.name, status: a.status, effectiveStatus: a.effective_status,
        campaignName: a.campaign?.name, adsetName: a.adset?.name,
        link: creativeLink(a.creative),
        ...adHealth(a),
      })),
    },
    sources,
    campaigns,
    // Ad Management only reports paid-channel sales — organic items still
    // count in `sources` above (for the organic footnote) but aren't listed.
    items: items.filter((i) => i.source !== "organic").slice(0, 100),
    totalPaid: {
      bookings: Object.values(sources).reduce((s, x) => s + x.bookings, 0),
      revenue: Object.values(sources).reduce((s, x) => s + x.revenue, 0),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metaToken = process.env.META_ADS_TOKEN;
  if (!metaToken) return NextResponse.json({ error: "Ads API not configured" }, { status: 500 });

  const body = await req.json();
  const { id, status, dailyBudget, fixTracking } = body as { id?: string; status?: string; dailyBudget?: number; fixTracking?: boolean };

  // Backfill url_tags on ads that lack them, so bookings from their clicks
  // show the campaign + ad name instead of a bare "Meta Ad". url_tags lives
  // on the ad creative, which Meta treats as immutable — the fix is to clone
  // the creative with the tags added and repoint the ad at the clone.
  if (fixTracking) {
    const accountId = process.env.META_AD_ACCOUNT_ID || "act_1408400061198101";
    let liveAds: MetaAd[];
    try {
      liveAds = (await metaGet(metaToken, `${accountId}/ads`, {
        fields: "name,effective_status,creative{url_tags}",
        limit: "200",
      })) as MetaAd[];
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
    }
    const results: { ad: string; ok: boolean; detail?: string }[] = [];
    for (const ad of liveAds) {
      if (["ARCHIVED", "DELETED"].includes(ad.effective_status || "") || !ad.creative?.id) continue;
      const existing = (ad.creative?.url_tags || "") as string;
      const merged = mergeUrlTags(existing);
      if (merged === existing) { results.push({ ad: ad.name, ok: true, detail: "already tracked" }); continue; }
      try {
        const cr = await metaRead(metaToken, ad.creative.id, "name,object_story_id,object_story_spec,asset_feed_spec");
        const params: Record<string, string> = {
          name: cr.name || `${ad.name} — creative`,
          url_tags: merged,
        };
        if (cr.object_story_id) params.object_story_id = cr.object_story_id;
        else if (cr.object_story_spec) params.object_story_spec = JSON.stringify(cr.object_story_spec);
        else if (cr.asset_feed_spec) params.asset_feed_spec = JSON.stringify(cr.asset_feed_spec);
        else throw new Error("unsupported creative — set URL parameters manually in Ads Manager");
        const newCr = await metaPost(metaToken, `${accountId}/adcreatives`, params);
        if (!newCr.id) throw new Error(newCr.error?.error_user_msg || newCr.error?.message || "creative rebuild failed");
        const upd = await metaPost(metaToken, ad.id, { creative: JSON.stringify({ creative_id: newCr.id }) });
        if (upd.error) throw new Error(upd.error.error_user_msg || upd.error.message || "couldn't point the ad at the new creative");
        results.push({ ad: ad.name, ok: true });
      } catch (e) {
        results.push({ ad: ad.name, ok: false, detail: e instanceof Error ? e.message : String(e) });
      }
    }
    const fixed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    return NextResponse.json({ success: true, fixed, failed, results });
  }

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
