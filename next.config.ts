import type { NextConfig } from "next";

/**
 * Split deployment:
 *  - Vercel (frontend): set API_ORIGIN=https://api.braidsbypeacejoy.com
 *    → every /api/* request is proxied to the cPanel Node app BEFORE local
 *      routes are matched, so the browser only ever talks to one origin (no CORS).
 *  - cPanel (backend): leave API_ORIGIN unset → this same codebase serves the
 *    API routes itself, next to the MySQL database.
 */
const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
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
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
