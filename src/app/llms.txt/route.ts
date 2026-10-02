import { buildLlmsTxt } from "@/lib/seo";
import { getServices } from "@/lib/services";

// /llms.txt — a concise, plain-text brief for AI assistants and LLM crawlers
// (the emerging llmstxt.org convention). Regenerated with the live style menu.
export const revalidate = 300;

export async function GET() {
  const body = buildLlmsTxt(await getServices());
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
