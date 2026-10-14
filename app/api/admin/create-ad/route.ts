import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";
const ACT = "act_1408400061198101";

// Custom audiences created for this account
const AUDIENCES: Record<string, string> = {
  visitors: "23859505630940794",
  checkout: "23859505630970794",
  purchasers: "23859505631010794",
  lookalike_purchasers: "23859505631030794",
  customers: "23859505634150794",
  lookalike_customers: "23859505637950794",
};

async function metaPost(token: string, path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  return res.json();
}

async function getPageId(token: string): Promise<string | null> {
  const res = await fetch(`${GRAPH}/me/accounts?access_token=${token}`, { cache: "no-store" });
  const json = await res.json();
  return json?.data?.[0]?.id || null;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metaToken = process.env.META_ADS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;
  if (!metaToken || !pixelId) return NextResponse.json({ error: "Meta ads not configured" }, { status: 500 });

  const body = await req.json();
  const { image, name, primaryText, headline, link, ctaType, audience, dailyBudget } = body as {
    image?: string; name?: string; primaryText?: string; headline?: string; link?: string;
    ctaType?: string; audience?: string; dailyBudget?: number;
  };

  if (!image || !name || !link || !dailyBudget) {
    return NextResponse.json({ error: "Missing image, name, link or budget" }, { status: 400 });
  }
  if (dailyBudget < 1) return NextResponse.json({ error: "Budget must be at least £1" }, { status: 400 });

  // 1. Upload the creative image
  const b64 = image.replace(/^data:image\/\w+;base64,/, "");
  const imgRes = await metaPost(metaToken, `${ACT}/adimages`, { bytes: b64 });
  const imageHash = imgRes?.images?.bytes?.hash || imgRes?.images?.[Object.keys(imgRes?.images || {})[0]]?.hash;
  if (!imageHash) {
    return NextResponse.json({ error: "Image upload failed: " + JSON.stringify(imgRes.error?.message || imgRes) }, { status: 400 });
  }

  // 2. Page for the ad identity
  const pageId = await getPageId(metaToken);
  if (!pageId) return NextResponse.json({ error: "No Facebook page found on this token" }, { status: 400 });

  // 3. Campaign (paused)
  const campaign = await metaPost(metaToken, `${ACT}/campaigns`, {
    name,
    objective: "OUTCOME_SALES",
    status: "PAUSED",
    special_ad_categories: "[]",
  });
  if (!campaign.id) return NextResponse.json({ error: "Campaign failed: " + (campaign.error?.message || "unknown") }, { status: 400 });

  // 4. Ad set (paused) — custom audience or 25-mile radius around Holt
  const targeting =
    audience && AUDIENCES[audience]
      ? { custom_audiences: [{ id: AUDIENCES[audience] }], geo_locations: { countries: ["GB"] } }
      : {
          geo_locations: {
            custom_locations: [{ latitude: 52.9076, longitude: 1.088, radius: 25, distance_unit: "mile" }],
          },
          age_min: 21,
        };


  const adset = await metaPost(metaToken, `${ACT}/adsets`, {
    name: `${name} — ad set`,
    campaign_id: campaign.id,
    daily_budget: String(Math.round(dailyBudget * 100)),
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    promoted_object: JSON.stringify({ pixel_id: pixelId, custom_event_type: "PURCHASE" }),
    targeting: JSON.stringify(targeting),
    status: "PAUSED",
    start_time: new Date(Date.now() + 3600000).toISOString(),
  });
  if (!adset.id) {
    return NextResponse.json({ error: "Ad set failed: " + (adset.error?.error_user_msg || adset.error?.message || "unknown"), campaignId: campaign.id }, { status: 400 });
  }

  // 5. Creative + ad (paused)
  const creative = await metaPost(metaToken, `${ACT}/adcreatives`, {
    name: `${name} — creative`,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link,
        message: primaryText || "",
        name: headline || name,
        call_to_action: { type: ctaType || "BOOK_NOW", value: { link } },
      },
    }),
  });
  if (!creative.id) {
    return NextResponse.json({ error: "Creative failed: " + (creative.error?.error_user_msg || creative.error?.message || "unknown"), campaignId: campaign.id, adsetId: adset.id }, { status: 400 });
  }

  const ad = await metaPost(metaToken, `${ACT}/ads`, {
    name,
    adset_id: adset.id,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: "PAUSED",
  });
  if (!ad.id) {
    return NextResponse.json({ error: "Ad failed: " + (ad.error?.error_user_msg || ad.error?.message || "unknown"), campaignId: campaign.id, adsetId: adset.id, creativeId: creative.id }, { status: 400 });
  }

  return NextResponse.json({ success: true, campaignId: campaign.id, adsetId: adset.id, adId: ad.id });
}
