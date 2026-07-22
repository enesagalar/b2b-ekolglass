import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/urunler`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/bayi-basvurusu`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
