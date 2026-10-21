export const META_GRAPH = "https://graph.facebook.com/v21.0";

// UTM params appended to every ad click — Meta substitutes the {{...}}
// placeholders with the actual campaign/adset/ad that generated the click.
// This is what turns a booking's "[Ad: ...]" note from a bare "Meta Ad"
// into "campaign name · ad name".
export const META_AD_URL_TAGS =
  "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

export async function metaPost(token: string, path: string, params: Record<string, string>) {
  const res = await fetch(`${META_GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  return res.json();
}

// Read a single Graph API node (unlike edge listing helpers that return .data)
export async function metaRead(token: string, path: string, fields: string) {
  const qs = new URLSearchParams({ fields, access_token: token });
  const res = await fetch(`${META_GRAPH}/${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(json.error.error_user_msg || json.error.message);
  return json;
}
