/**
 * Split deployment:
 *  - Optional split hosting (e.g. frontend on Vercel): set API_ORIGIN=https://api.braidsbypeacejoy.com
 *    → every /api/* request is proxied to the cPanel Node app BEFORE local
 *      routes are matched, so the browser only ever talks to one origin (no CORS).
 *  - cPanel (backend): leave API_ORIGIN unset → this same codebase serves the
 *    API routes itself, next to the MySQL database.
 *
 * Plain JS (not next.config.ts) so production servers can load it without TypeScript installed.
 */
const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "");

/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Pin the project root (a stray lockfile on the Desktop confuses Turbopack's detection).
  turbopack: { root: process.cwd() },
  async rewrites() {
    return {
      beforeFiles: apiOrigin ? [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }] : [],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The host's LiteSpeed server caches pages; Next marks prerendered pages as
        // cacheable "for a year". Cap LiteSpeed at 10 minutes for PAGES (each deploy
        // also purges it). API responses are never cached — see the next rule.
        source: "/((?!_next/static|assets|api|manage|unsubscribe|review).*)",
        headers: [{ key: "X-LiteSpeed-Cache-Control", value: "public,max-age=600" }],
      },
      {
        // Live data (availability, balances, payment status, health): never cache.
        source: "/api/:path*",
        headers: [{ key: "X-LiteSpeed-Cache-Control", value: "no-cache" }],
      },
      {
        // Owner area: private client data — never cache anywhere, never index.
        source: "/manage/:path*",
        headers: [
          { key: "X-LiteSpeed-Cache-Control", value: "no-cache" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Per-client email preferences: never cache, never index.
        source: "/unsubscribe",
        headers: [
          { key: "X-LiteSpeed-Cache-Control", value: "no-cache" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/manage",
        headers: [
          { key: "X-LiteSpeed-Cache-Control", value: "no-cache" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
