import type { MetadataRoute } from "next";
import { CATEGORIES, STYLES } from "@/content/styles";
import { siteUrl } from "@/lib/seo";

// Plain URL list only. (Image entries were written before <lastmod>, which breaks the
// sitemap schema order and made Search Console report "Sitemap could not be read".)
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  const now = new Date();
  return [
    { url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${url}/styles`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...CATEGORIES.filter((c) => STYLES.some((st) => st.category === c.id && !st.hidden)).map((c) => ({ url: `${url}/styles?category=${c.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${url}/book`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${url}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${url}/policies`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${url}/pay`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
