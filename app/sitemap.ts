import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://theslimestudio.co.uk";
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/booking`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/parties`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/shop`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/gift-card`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/gallery`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faqs`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/subscribe`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/loyalty`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const { data: events } = await supabaseAdmin
    .from("special_events")
    .select("id, slug, updated_at")
    .eq("is_active", true);

  const eventPages: MetadataRoute.Sitemap = (events || []).map((event) => ({
    url: `${base}/events/${event.slug || event.id}`,
    lastModified: event.updated_at ? new Date(event.updated_at) : lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages];
}
