import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SALON } from "@/lib/config";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Braidsbypeacejoy | Luxury Braids & Locs in Randallstown, MD",
    template: "%s | Braidsbypeacejoy",
  },
  description: `Luxury knotless braids, boho locs and protective styles. Book online — ${SALON.fullAddress}. Open daily 8 AM – 7 PM.`,
  openGraph: {
    type: "website",
    siteName: SALON.name,
    locale: "en_US",
    images: [{ url: "/assets/logo1.jpeg", width: 1254, height: 1254, alt: "Braids by Peace Joy" }],
  },
  icons: { icon: "/assets/logo2.png", apple: "/assets/logo2.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b1a4a",
};

// Local-business structured data for Google Maps / search.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: SALON.name,
  address: {
    "@type": "PostalAddress",
    streetAddress: "8700 Liberty Rd, PHENIX Salon Suite 101",
    addressLocality: "Randallstown",
    addressRegion: "MD",
    addressCountry: "US",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00",
      closes: "19:00",
    },
  ],
  priceRange: "$$$",
  telephone: "+1-410-671-1788",
  image: "/assets/logo1.jpeg",
  sameAs: Object.values(SALON.socials),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
