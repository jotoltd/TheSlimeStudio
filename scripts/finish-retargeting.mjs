// Finishes the retargeting campaign: finds the existing "Site visitors — 180d"
// audience + "Retargeting — warm audience" campaign, then creates the ad set
// (with targeting_automation.advantage_audience=0 so Meta can't expand past
// the warm audience), creative and ad.
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
const T = env.META_ADS_TOKEN;
const PIXEL = env.META_PIXEL_ID;
const G = "https://graph.facebook.com/v21.0";
const ACT = env.META_AD_ACCOUNT_ID || "act_1408400061198101";
const LINK = "https://theslimestudio.co.uk/go";
const URL_TAGS = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";
const IMAGE_HASHES = [
  "e2a8ca1f66b641856a25f1c88aa128a5",
  "04492626dc698879a69f99a3cade51b4",
  "76b6d7a5a11f5f01a3b935af8a633bf0",
  "2edfb33b01f406f5396ca0a7ec8509de",
  "3de54047376642af76e17f4aeac52e29",
  "7959918322600c48e26cedbc6c45579b",
];

const get = async (p, q = {}) =>
  (await fetch(`${G}/${p}?${new URLSearchParams({ ...q, access_token: T })}`)).json();
const post = async (p, params) =>
  (await fetch(`${G}/${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: T }),
  })).json();
const must = (j, w) => {
  if (!j?.id) throw new Error(`${w} failed: ${j?.error?.error_user_msg || j?.error?.message || JSON.stringify(j)}`);
  return j.id;
};

const auds = await get(`${ACT}/customaudiences`, { fields: "id,name", limit: "10" });
const camps = await get(`${ACT}/campaigns`, { fields: "id,name", limit: "10" });
const aud = (auds.data || []).find((a) => a.name.includes("Site visitors"));
const camp = (camps.data || []).find((c) => c.name.includes("Retargeting"));
console.log("audience:", aud?.id, "campaign:", camp?.id);
if (!aud || !camp) throw new Error("audience or campaign not found");

const adsetId = must(
  await post(`${ACT}/adsets`, {
    name: "Retargeting — warm audience — ad set",
    campaign_id: camp.id,
    daily_budget: "100",
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    promoted_object: JSON.stringify({ pixel_id: PIXEL, custom_event_type: "PURCHASE" }),
    targeting: JSON.stringify({
      custom_audiences: [{ id: aud.id }],
      geo_locations: {
        cities: [{ country: "GB", distance_unit: "kilometer", key: "809798", name: "Holt", radius: 80, region: "England", region_id: "4079" }],
        location_types: ["frequently_in", "home", "recent"],
      },
      age_min: 18,
      age_max: 65,
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
      targeting_automation: { advantage_audience: 0 },
    }),
    status: "ACTIVE",
  }),
  "ad set"
);
console.log("ad set:", adsetId);

const pageId = (await get("me/accounts")).data?.[0]?.id;
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
      bodies: [
        "Still thinking about it? 🎨\n\nThe slime will not make itself — book a hands-on session at The Slime Studio in Holt. Every child takes home their own slime. From £15.\n\nGrab a slot 👇",
        "You looked, they asked, we both know what comes next 😄\n\n1-hour slime sessions at The Slime Studio, Holt — colours, scents, toppings bar, take-home pot. Weekend slots fill fast.\n\nBook now 👇",
      ].map((t) => ({ text: t })),
      titles: ["Book Your Slime Session", "Still Thinking About It?"].map((t) => ({ text: t })),
      descriptions: ["1-hour slime making in Holt — from £15", "Kids make & take home their own slime"].map((t) => ({ text: t })),
      images: IMAGE_HASHES.map((h) => ({ hash: h })),
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
console.log("ad:", adId, "| creative:", creativeId);
console.log("Done — retargeting campaign ACTIVE at £1/day.");
