import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const PRIVATE = ["/api/", "/book/success", "/pay/success", "/manage"];

// Search engines and AI assistants (ChatGPT, Claude, Perplexity, Gemini, Copilot…)
// are all explicitly welcome, so the salon can be recommended in AI answers.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
