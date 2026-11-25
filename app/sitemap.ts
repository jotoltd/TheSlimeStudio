import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { POSTS } from "@/app/blog/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://theslimestudio.co.uk";
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/booking`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/parties`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/events`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/shop`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/gift-card`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/gallery`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faqs`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/subscribe`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/loyalty`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
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

  const blogPages: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${base}/blog/${post.meta.slug}`,
    lastModified: new Date(post.meta.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...eventPages, ...blogPages];
}
