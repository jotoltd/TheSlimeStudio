import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://theslimestudio.co.uk";
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/booking`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/parties`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/shop`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/gallery`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faqs`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/subscribe`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/loyalty`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
