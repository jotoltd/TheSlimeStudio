// Creates the Retargeting campaign at £1/day: custom audience of recent
// website visitors (pixel PageViews, 180d), one ad set, one ad reusing the
// sessions creative images with "still thinking about it" copy.
// Lands on /go like the sessions ad. Created ACTIVE.
//
// Usage: node scripts/create-retargeting-ad.mjs
// Env: META_ADS_TOKEN, META_PIXEL_ID, META_AD_ACCOUNT_ID from .env.local

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);

const GRAPH = "https://graph.facebook.com/v21.0";
const TOKEN = env.META_ADS_TOKEN;
const PIXEL = env.META_PIXEL_ID;
const ACT = env.META_AD_ACCOUNT_ID || "act_1408400061198101";
if (!TOKEN || !PIXEL) throw new Error("META_ADS_TOKEN / META_PIXEL_ID missing from .env.local");

const LINK = "https://theslimestudio.co.uk/go";
const CAMPAIGN_NAME = "Retargeting — warm audience";
const URL_TAGS = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

// Session-ad image hashes already hosted in the ad account (multi-size set).
const IMAGE_HASHES = [
  "e2a8ca1f66b641856a25f1c88aa128a5", // square
  "04492626dc698879a69f99a3cade51b4", // 4:5
  "76b6d7a5a11f5f01a3b935af8a633bf0", // 2:3
  "2edfb33b01f406f5396ca0a7ec8509de", // 9:16
  "3de54047376642af76e17f4aeac52e29", // landscape
  "7959918322600c48e26cedbc6c45579b", // original
];

const BODIES = [
  "Still thinking about it? 🎨\n\nThe slime won't make itself — book a hands-on session at The Slime Studio in Holt. Every child takes home their own slime. From £15.\n\nGrab a slot 👇",
  "You looked, they asked, we both know what's next 😄\n\n1-hour slime sessions at The Slime Studio, Holt — colours, scents, toppings bar, take-home pot. Weekend slots fill fast.\n\nBook now 👇",
];
const TITLES = [
  "Book Your Slime Session",
  "Still Thinking About It?",
];
const DESCRIPTIONS = [
  "1-hour slime making in Holt — from £15",
  "Kids make & take home their own slime",
];

const post = async (path, params) => {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: TOKEN }),
  });
  return res.json();
};
const must = (json, what) => {
  if (!json?.id) throw new Error(`${what} failed: ${json?.error?.error_user_msg || json?.error?.message || JSON.stringify(json)}`);
  return json.id;
};

// 1. Custom audience — pixel PageViews, last 180 days
const audienceId = must(
  await post(`${ACT}/customaudiences`, {
    name: "Site visitors — 180d",
    description: "Anyone who hit theslimestudio.co.uk (pixel PageView) in the last 180 days",
    rule: JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [
          {
            event_sources: [{ type: "pixel", id: PIXEL }],
            retention_seconds: 15552000, // 180 days
            filter: {
              operator: "and",
              filters: [{ field: "event", operator: "eq", value: "PageView" }],
            },
          },
        ],
      },
    }),
  }),
  "custom audience"
);
console.log("audience:", audienceId);

// 2. Campaign + ad set + ad — all ACTIVE
const campaignId = must(
  await post(`${ACT}/campaigns`, {
    name: CAMPAIGN_NAME,
    objective: "OUTCOME_SALES",
    status: "ACTIVE",
    special_ad_categories: "[]",
    is_adset_budget_sharing_enabled: "false",
  }),
  "campaign"
);
console.log("campaign:", campaignId);

const adsetId = must(
  await post(`${ACT}/adsets`, {
    name: `${CAMPAIGN_NAME} — ad set`,
    campaign_id: campaignId,
    daily_budget: "100",
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    promoted_object: JSON.stringify({ pixel_id: PIXEL, custom_event_type: "PURCHASE" }),
    targeting: JSON.stringify({
      custom_audiences: [{ id: audienceId }],
      geo_locations: {
        cities: [
          { country: "GB", distance_unit: "kilometer", key: "809798", name: "Holt", radius: 80, region: "England", region_id: "4079" },
        ],
        location_types: ["frequently_in", "home", "recent"],
      },
      age_min: 18,
      age_max: 65,
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
    }),
    status: "ACTIVE",
  }),
  "ad set"
);
console.log("ad set:", adsetId);

const pages = await (await fetch(`${GRAPH}/me/accounts?access_token=${TOKEN}`)).json();
const pageId = pages?.data?.[0]?.id;
if (!pageId) throw new Error("No Facebook page found on this token");

const creativeId = must(
  await post(`${ACT}/adcreatives`, {
    name: "Retargeting — still thinking creative",
    url_tags: URL_TAGS,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: { link: LINK, call_to_action: { type: "BOOK_NOW", value: { link: LINK } } },
    }),
    asset_feed_spec: JSON.stringify({
      ad_formats: ["SINGLE_IMAGE"],
      optimization_type: "DEGREES_OF_FREEDOM",
      bodies: BODIES.map((text) => ({ text })),
      titles: TITLES.map((text) => ({ text })),
      descriptions: DESCRIPTIONS.map((text) => ({ text })),
      images: IMAGE_HASHES.map((hash) => ({ hash })),
      call_to_action_types: ["BOOK_NOW"],
      link_urls: [{ website_url: LINK }],
    }),
  }),
  "creative"
);

const adId = must(
  await post(`${ACT}/ads`, {
    name: "Retargeting — still thinking",
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: "ACTIVE",
  }),
  "ad"
);
console.log("ad:", adId, "creative:", creativeId);
console.log("\nDone — retargeting campaign ACTIVE at £1/day.");
