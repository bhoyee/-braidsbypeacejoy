import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/seo";

// Brand name, colours and icon for "Add to Home Screen" (still possible from the browser menu).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Luxury Braiding Studio`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    // "browser" (not "standalone"): opens as a normal website, so browsers don't show an "Install app" prompt.
    display: "browser",
    background_color: "#0b1a4a",
    theme_color: "#0b1a4a",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
