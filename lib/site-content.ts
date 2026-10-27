import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

// Server-side site_content fetch for pages that render real copy into the
// HTML (so first paint already shows final text — no client fetch-and-swap
// reflow). Cached for 60s so dashboard content edits propagate quickly
// without a redeploy.
export const getSiteContent = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const { data } = await supabaseAdmin
        .from("site_content")
        .select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((r: { key: string; value: string }) => {
        map[r.key] = r.value;
      });
      return { ...CONTENT_DEFAULTS, ...map };
    } catch {
      return { ...CONTENT_DEFAULTS };
    }
  },
  ["site-content"],
  { revalidate: 60 }
);
