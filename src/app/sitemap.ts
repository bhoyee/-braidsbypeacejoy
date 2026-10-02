import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  const now = new Date();
  return [
    { url, lastModified: now, changeFrequency: "weekly", priority: 1, images: [`${url}/opengraph-image`, `${url}/assets/pix3.jpeg`, `${url}/assets/pix5.jpeg`] },
    { url: `${url}/book`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${url}/policies`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${url}/pay`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
