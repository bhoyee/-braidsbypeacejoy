import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BRAND, siteUrl } from "@/lib/seo";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const TITLE = "Braids by Peace Joy | Knotless & Boho Braids in Randallstown, MD";
const DESCRIPTION =
  "Luxury braiding studio in Randallstown, MD (PHENIX Salon Suites, Suite 101). Knotless, boho, box braids, cornrows, stitch & Fulani braids and twists for adults and kids. Open 7 days, 8 AM–7 PM — book online.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: "%s | Braids by Peace Joy" },
  description: DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [...BRAND.keywords],
  category: "Beauty salon",
  alternates: { canonical: "/" },
  formatDetection: { telephone: true, address: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    // Image comes from app/opengraph-image.tsx automatically.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Favicons come from src/app/favicon.ico, icon.png and apple-icon.png (square, white background).
  // Paste the code from Google Search Console / Bing Webmaster Tools into these env vars.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  other: { "geo.region": "US-MD", "geo.placename": "Randallstown" },
};

export const viewport: Viewport = {
  themeColor: "#0b1a4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <WhatsAppButton />
      </body>
    </html>
  );
}
