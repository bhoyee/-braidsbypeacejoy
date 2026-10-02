import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/seo";

// Lets clients "Add to Home Screen" with the brand name, colours and logo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Luxury Braiding Studio`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b1a4a",
    theme_color: "#0b1a4a",
    icons: [{ src: "/assets/logo2.png", sizes: "500x500", type: "image/png", purpose: "any" }],
  };
}
