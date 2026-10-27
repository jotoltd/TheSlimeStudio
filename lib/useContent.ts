"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

const DEFAULTS = CONTENT_DEFAULTS;

export function useContent() {
  const [content, setContent] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
          setContent({ ...DEFAULTS, ...map });
        }
        setLoading(false);
      });
  }, []);

  return { content, loading };
}

export { DEFAULTS as CONTENT_DEFAULTS };
