// Creates a PAUSED wide-reach Meta ad (Holt +50mi, £8/day) — review in Ads
// Manager then activate manually. Nothing spends until you flip it live.
//
// Usage: node scripts/create-wide-ad.mjs /path/to/image.jpg
// Env: reads META_ADS_TOKEN, META_PIXEL_ID, META_AD_ACCOUNT_ID from .env.local

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
const IMAGE = process.argv[2];
// Optional: reuse an existing (paused) campaign/ad set instead of creating
// them — pass their IDs as args 3 and 4. Useful for retries after a partial
// failure.
const EXISTING_CAMPAIGN = process.argv[3];
const EXISTING_ADSET = process.argv[4];
if (!TOKEN || !PIXEL) throw new Error("META_ADS_TOKEN / META_PIXEL_ID missing from .env.local");
if (!IMAGE) throw new Error("Usage: node scripts/create-wide-ad.mjs <image-path>");

const LINK = "https://theslimestudio.co.uk/go";
const CAMPAIGN_NAME = "Wide Reach 50mi — Slime Sessions";
const AD_NAME = "Wide reach — vertical static";
const DAILY_BUDGET_GBP = 8;

// Same url_tags the other ads carry — this is what stamps campaign/ad names
// onto bookings for attribution.
const URL_TAGS = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

const BODIES = [
  "It's beginning to look a lot like… slime 🎄✨\n\nChristmas is coming to The Slime Studio in Holt — 1-hour sessions where kids mix their own festive slime and take it home. The stocking filler they'll actually love.\n\nWorth the drive? Book a slot 👇",
  "Families already drive over an hour for this 🌈🎄\n\nBook a 1-hour slime session at The Slime Studio, Holt — festive colours, fun toppings, take-home pot. From £15 per child.\n\nNorfolk & beyond — weekend slots fill fast 👇",
  "The Christmas gift they'll actually remember �\n\nAn hour of hands-on slime fun at The Slime Studio — under an hour from Norwich, King's Lynn & Thetford. Sessions from £15, gift cards available too.\n\nGrab a slot 👇",
  "Messy, colourful Christmas fun 🚗✨\n\nKids mix their own slime at The Slime Studio in Holt and take it home — all materials included, festive vibes guaranteed. From £15.\n\nBook your slot 👇",
];
const TITLES = [
  "Christmas Slime Fun — From £15",
  "Worth the Drive — Slime Sessions",
  "The Festive Day Out They'll Love",
  "Book a Slime Session — Holt",
];
const DESCRIPTIONS = [
  "1-hour hands-on slime making in Holt, Norfolk",
  "Kids mix their own slime & take it home",
  "Christmas gift cards available",
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

// 1. Upload image
const b64 = readFileSync(IMAGE).toString("base64");
const img = await post(`${ACT}/adimages`, { bytes: b64 });
const imageHash =
  img?.images?.bytes?.hash ||
  img?.images?.[Object.keys(img?.images || {})[0]]?.hash;
if (!imageHash) throw new Error("Image upload failed: " + JSON.stringify(img?.error || img));
console.log("image hash:", imageHash);

// 2. Page for ad identity
const pages = await (await fetch(`${GRAPH}/me/accounts?access_token=${TOKEN}`)).json();
const pageId = pages?.data?.[0]?.id;
if (!pageId) throw new Error("No Facebook page found on this token");
console.log("page:", pageId);

// 3. Campaign (paused) — or reuse one passed as arg 3
const campaignId = EXISTING_CAMPAIGN || must(
  await post(`${ACT}/campaigns`, {
    name: CAMPAIGN_NAME,
    objective: "OUTCOME_SALES",
    status: "PAUSED",
    special_ad_categories: "[]",
    is_adset_budget_sharing_enabled: "false",
  }),
  "campaign"
);
console.log("campaign:", campaignId);

// 4. Ad set (paused) — Holt +50mi (~80km), buyers skew 25-54. Mirrors the
// working ad sets' targeting shape: city radius + location_types so recent
// visitors count, not just residents.
const adsetId = EXISTING_ADSET || must(
  await post(`${ACT}/adsets`, {
    name: `${CAMPAIGN_NAME} — ad set`,
    campaign_id: campaignId,
    daily_budget: String(Math.round(DAILY_BUDGET_GBP * 100)),
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    promoted_object: JSON.stringify({ pixel_id: PIXEL, custom_event_type: "PURCHASE" }),
    targeting: JSON.stringify({
      geo_locations: {
        cities: [
          { country: "GB", distance_unit: "kilometer", key: "809798", name: "Holt", radius: 80, region: "England", region_id: "4079" },
        ],
        location_types: ["frequently_in", "home", "recent"],
      },
      age_min: 25,
      age_max: 65,
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
    }),
    status: "PAUSED",
  }),
  "ad set"
);
console.log("ad set:", adsetId);

// 5. Creative — asset_feed_spec so Meta rotates the 4 copy variants
const creativeId = must(
  await post(`${ACT}/adcreatives`, {
    name: `${AD_NAME} — creative`,
    url_tags: URL_TAGS,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: {
        link: LINK,
        call_to_action: { type: "BOOK_NOW", value: { link: LINK } },
      },
    }),
    asset_feed_spec: JSON.stringify({
      ad_formats: ["SINGLE_IMAGE"],
      optimization_type: "DEGREES_OF_FREEDOM",
      bodies: BODIES.map((text) => ({ text })),
      titles: TITLES.map((text) => ({ text })),
      descriptions: DESCRIPTIONS.map((text) => ({ text })),
      images: [{ hash: imageHash }],
      call_to_action_types: ["BOOK_NOW"],
      link_urls: [{ website_url: LINK }],
    }),
  }),
  "creative"
);
console.log("creative:", creativeId);

// 6. Ad (paused)
const adId = must(
  await post(`${ACT}/ads`, {
    name: AD_NAME,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: "PAUSED",
  }),
  "ad"
);
console.log("ad:", adId);

console.log(`\nDone — everything is PAUSED. Review in Ads Manager then activate:`);
console.log(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${ACT.replace("act_", "")}`);
