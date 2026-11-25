// Creates the "Parties" Meta campaign at £4/day: one campaign, one ad set,
// two ads (standard flyer + premium flyer, each with all placement sizes).
// Lands on /parties — AdPixels captures the UTM/fbclid there so bookings
// still attribute. Everything is created PAUSED unless --activate is passed.
//
// Usage: node scripts/create-party-ad.mjs <image-dir> [--activate]
// Env: META_ADS_TOKEN, META_PIXEL_ID, META_AD_ACCOUNT_ID from .env.local

import { readdirSync, readFileSync } from "node:fs";
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
const IMG_DIR = process.argv[2];
const ACTIVATE = process.argv.includes("--activate");
const STATUS = ACTIVATE ? "ACTIVE" : "PAUSED";
if (!TOKEN || !PIXEL) throw new Error("META_ADS_TOKEN / META_PIXEL_ID missing from .env.local");
if (!IMG_DIR) throw new Error("Usage: node scripts/create-party-ad.mjs <image-dir> [--activate]");

const LINK = "https://theslimestudio.co.uk/parties";
const CAMPAIGN_NAME = "Parties — Norfolk";
const DAILY_BUDGET_PENCE = "400";
const URL_TAGS = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

const BODIES = [
  "Norfolk's messiest birthday party 🎉\n\nPrivate studio hire in Holt — every child makes their own slime, hits the toppings bar, and takes a pot home. Balloons & birthday banner included, up to 15 kids.\n\nThe mess stays with us. Book your date 👇",
  "Birthday party, sorted ✅\n\nSlime & squishy fun at The Slime Studio in Holt — private studio, charm bar, giant slime bubbles, take-home slime for every child. After-school parties from £110.\n\nWeekend slots go fast — enquire now 👇",
  "The party they'll talk about all year 🌈\n\nMake-your-own slime party at The Slime Studio, Holt — 40 mins from Norwich. Private hire, all materials included, every child takes home their own slime.\n\nCheck your date 👇",
  "A birthday party with ZERO mess at home 🎂\n\nKids mix, stretch and decorate their own slime in our Holt studio — private hire, balloons and banner included, take-home pots for everyone.\n\nWeekend & after-school slots 👇",
];
const TITLES = [
  "Slime Party — Book Your Date",
  "Norfolk's Messiest Birthday Party",
  "Private Slime Parties in Holt",
  "After-School Parties From £110",
];
const DESCRIPTIONS = [
  "Private studio hire — up to 15 kids",
  "Every child takes home their own slime",
  "40 mins from Norwich — balloons included",
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

// Upload every image for a flyer and return its hash list.
async function uploadSet(prefix) {
  const files = readdirSync(IMG_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".jpg"))
    .sort();
  const hashes = [];
  for (const f of files) {
    const b64 = readFileSync(join(IMG_DIR, f)).toString("base64");
    const img = await post(`${ACT}/adimages`, { bytes: b64 });
    const hash = img?.images?.bytes?.hash || img?.images?.[Object.keys(img?.images || {})[0]]?.hash;
    if (!hash) throw new Error(`upload failed for ${f}: ` + JSON.stringify(img?.error || img));
    hashes.push(hash);
    console.log(`  ${f} -> ${hash}`);
  }
  return hashes;
}

console.log("Uploading standard flyer set:");
const standardHashes = await uploadSet("standard-");
console.log("Uploading premium flyer set:");
const premiumHashes = await uploadSet("premium-");

const pages = await (await fetch(`${GRAPH}/me/accounts?access_token=${TOKEN}`)).json();
const pageId = pages?.data?.[0]?.id;
if (!pageId) throw new Error("No Facebook page found on this token");

const campaignId = must(
  await post(`${ACT}/campaigns`, {
    name: CAMPAIGN_NAME,
    objective: "OUTCOME_SALES",
    status: STATUS,
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
    daily_budget: DAILY_BUDGET_PENCE,
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
    status: STATUS,
  }),
  "ad set"
);
console.log("ad set:", adsetId);

async function createAd(adName, hashes) {
  const creativeId = must(
    await post(`${ACT}/adcreatives`, {
      name: `${adName} — creative`,
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
        images: hashes.map((hash) => ({ hash })),
        call_to_action_types: ["BOOK_NOW"],
        link_urls: [{ website_url: LINK }],
      }),
    }),
    `${adName} creative`
  );
  const adId = must(
    await post(`${ACT}/ads`, {
      name: adName,
      adset_id: adsetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: STATUS,
    }),
    adName
  );
  console.log(`${adName}: creative ${creativeId}, ad ${adId}`);
}

await createAd("Party — standard flyer", standardHashes);
await createAd("Party — premium flyer", premiumHashes);

console.log(`\nDone — everything ${STATUS}.`);
if (!ACTIVATE) {
  console.log("Review in Ads Manager, then activate the campaign/ad set/ads:");
  console.log(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${ACT.replace("act_", "")}`);
}
