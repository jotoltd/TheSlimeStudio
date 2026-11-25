// Swaps the images on an existing ad's creative for a new set (e.g. multiple
// aspect ratios so Meta picks the right crop per placement). Fetches the
// ad's CURRENT creative spec first so any copy edits made in Ads Manager are
// preserved — only the images array is replaced.
//
// Usage: node scripts/update-ad-images.mjs <ad-id> <image-dir>
// Env: reads META_ADS_TOKEN, META_AD_ACCOUNT_ID from .env.local

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
const ACT = env.META_AD_ACCOUNT_ID || "act_1408400061198101";
const AD_ID = process.argv[2];
const IMG_DIR = process.argv[3];
if (!TOKEN) throw new Error("META_ADS_TOKEN missing from .env.local");
if (!AD_ID || !IMG_DIR) throw new Error("Usage: node scripts/update-ad-images.mjs <ad-id> <image-dir>");

const post = async (path, params) => {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: TOKEN }),
  });
  return res.json();
};
const get = async (path, params = {}) => {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  return (await fetch(`${GRAPH}/${path}?${qs}`)).json();
};
const must = (json, what) => {
  if (!json?.id) throw new Error(`${what} failed: ${json?.error?.error_user_msg || json?.error?.message || JSON.stringify(json)}`);
  return json.id;
};
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

// 1. Find the ad's current creative and pull its spec
const ad = await get(AD_ID, { fields: "creative{id,name}" });
const creativeId = ad?.creative?.id;
if (!creativeId) throw new Error(`Could not resolve creative for ad ${AD_ID}: ${JSON.stringify(ad)}`);
const creative = await get(creativeId, {
  fields: "name,url_tags,asset_feed_spec,object_story_spec,effective_object_story_id",
});
const feedSpec = parse(creative.asset_feed_spec);
const storySpec = parse(creative.object_story_spec);
if (!feedSpec?.images?.length) throw new Error("Current creative has no asset_feed_spec images — cannot rebuild safely");
console.log(`current creative ${creativeId}: ${feedSpec.images.length} images, ${feedSpec.bodies?.length || 0} bodies`);

// 2. Upload every image in the dir
const files = readdirSync(IMG_DIR)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort();
if (!files.length) throw new Error(`No images found in ${IMG_DIR}`);
const hashes = [];
for (const f of files) {
  const b64 = readFileSync(join(IMG_DIR, f)).toString("base64");
  const img = await post(`${ACT}/adimages`, { bytes: b64 });
  const hash =
    img?.images?.bytes?.hash ||
    img?.images?.[Object.keys(img?.images || {})[0]]?.hash;
  if (!hash) throw new Error(`Upload failed for ${f}: ${JSON.stringify(img?.error || img)}`);
  hashes.push(hash);
  console.log(`${f} → ${hash}`);
}

// 3. Rebuild the asset feed with the new image set — everything else identical
feedSpec.images = hashes.map((hash) => ({ hash }));

const newCreativeId = must(
  await post(`${ACT}/adcreatives`, {
    name: `${creative.name || "ad"} — images ${new Date().toISOString().slice(0, 10)}`,
    ...(creative.url_tags ? { url_tags: creative.url_tags } : {}),
    object_story_spec: JSON.stringify(storySpec),
    asset_feed_spec: JSON.stringify(feedSpec),
  }),
  "creative"
);
console.log("new creative:", newCreativeId);

// 4. Repoint the ad
await post(AD_ID, { creative: JSON.stringify({ creative_id: newCreativeId }) });
const check = await get(AD_ID, { fields: "name,status,effective_status,creative{id,name}" });
console.log("ad now:", JSON.stringify(check, null, 2));
