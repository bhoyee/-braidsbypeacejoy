// SEO / social / AI-search content. FAQs live in src/content/faqs.ts and the style
// menu in src/content/styles.ts; the JSON-LD and /llms.txt are built from them.
import { FAQS, TOPICS } from "@/content/faqs";
import { CATEGORIES } from "@/content/styles";
import { SALON } from "./config";
import { BOOKING_POLICIES } from "./policies";
import type { PublicService } from "./services";
import { formatDuration, formatUSD } from "./time";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export const BRAND = {
  name: "Braids by Peace Joy",
  altNames: ["Braidsbypeacejoy", "Braids By PeaceJoy"],
  tagline: "Your beauty satisfaction is our priority.",
  description:
    "Braids by Peace Joy is a luxury braiding studio in Randallstown, Maryland (PHENIX Salon Suites, Suite 101) offering knotless braids, boho braids, box braids, cornrows, stitch braids, Fulani braids and twists for adults and kids. Open 7 days, 8 AM – 7 PM, with online booking.",
  address: {
    street: "8700 Liberty Rd, Suite 101",
    building: "PHENIX Salon Suites",
    city: "Randallstown",
    region: "MD",
    postalCode: "21133",
    country: "US",
  },
  areaServed: ["Randallstown", "Owings Mills", "Pikesville", "Windsor Mill", "Woodlawn", "Baltimore County", "Baltimore"],
  styles: [
    "Knotless braids",
    "Boho (bohemian) knotless braids",
    "Box braids",
    "Cornrows",
    "Stitch braids",
    "Fulani braids",
    "Kinky twists",
    "Senegalese twists",
    "Mermaid braids",
    "Bora Bora braids",
    "Kids braids",
  ],
  keywords: [
    "braids Randallstown MD",
    "knotless braids Randallstown",
    "braiding salon near me",
    "hair braiding Baltimore County",
    "boho knotless braids Maryland",
    "box braids Randallstown",
    "kids braids Randallstown",
    "stitch braids Baltimore",
    "Fulani braids Maryland",
    "Senegalese twists Randallstown",
    "PHENIX Salon Suites Randallstown",
    "Braids by Peace Joy",
  ],
} as const;

const absolute = (path: string) => `${siteUrl()}${path}`;

/** schema.org HairSalon graph (LocalBusiness) + offers for every style + FAQ. */
export function buildHomeJsonLd(services: PublicService[]) {
  const url = siteUrl();
  const business = {
    "@type": ["HairSalon", "BeautySalon"],
    "@id": `${url}/#business`,
    name: BRAND.name,
    alternateName: BRAND.altNames,
    description: BRAND.description,
    slogan: BRAND.tagline,
    url,
    telephone: "+1-410-671-1788",
    image: [absolute("/opengraph-image"), absolute("/assets/pix5.jpeg"), absolute("/assets/pix3.jpeg")],
    logo: absolute("/assets/logo2.png"),
    priceRange: "$$",
    currenciesAccepted: "USD",
    paymentAccepted: "Credit card, Debit card, Apple Pay, Link, Cash App, Zelle",
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND.address.street,
      addressLocality: BRAND.address.city,
      addressRegion: BRAND.address.region,
      postalCode: BRAND.address.postalCode,
      addressCountry: BRAND.address.country,
    },
    hasMap: SALON.mapsUrl,
    areaServed: BRAND.areaServed.map((name) => ({ "@type": "Place", name })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "08:00",
        closes: "19:00",
      },
    ],
    sameAs: Object.values(SALON.socials),
    potentialAction: {
      "@type": "ReserveAction",
      target: { "@type": "EntryPoint", urlTemplate: absolute("/book"), actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] },
      result: { "@type": "Reservation", name: "Hair braiding appointment" },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Braiding style menu",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        url: absolute(`/book?service=${s.slug}`),
        price: (s.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          description: s.description ?? undefined,
          serviceType: "Hair braiding",
          provider: { "@id": `${url}/#business` },
          ...(s.imageUrl ? { image: absolute(s.imageUrl) } : {}),
        },
      })),
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: BRAND.name,
    alternateName: BRAND.altNames,
    publisher: { "@id": `${url}/#business` },
    inLanguage: "en-US",
  };

  return { "@context": "https://schema.org", "@graph": [business, website] };
}

/** schema.org FAQPage for /faq (every question in src/content/faqs.ts). */
export function buildFaqJsonLd() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}/faq#faq`,
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Plain-text summary for AI assistants / LLM crawlers (served at /llms.txt). */
export function buildLlmsTxt(services: PublicService[]) {
  const url = siteUrl();
  const line = (s: PublicService) =>
    `- ${s.name}: ${formatUSD(s.priceCents)} · about ${formatDuration(s.durationMin)}${s.description ? ` — ${s.description}` : ""} (book: ${url}/book?service=${s.slug})`;
  const menu = services.length
    ? CATEGORIES.filter((c) => services.some((s) => s.category === c.id))
        .map((c) => `### ${c.label}\n${services.filter((s) => s.category === c.id).map(line).join("\n")}`)
        .join("\n\n")
    : `- See the live style menu at ${url}/styles`;
  const faqText = TOPICS.map(
    (t) => `### ${t.label}\n${FAQS.filter((f) => f.topic === t.id).map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}`,
  ).join("\n\n");

  const policiesText = BOOKING_POLICIES.map((p) => `### ${p.title}\n${p.points.map((x) => `- ${x}`).join("\n")}`).join("\n\n");

  return `# ${BRAND.name}

> ${BRAND.description}

## Key facts
- Business name: ${BRAND.name} (also written ${BRAND.altNames.join(", ")})
- Type: Hair braiding salon / luxury braiding studio
- Address: ${BRAND.address.street}, ${BRAND.address.building}, ${BRAND.address.city}, ${BRAND.address.region} ${BRAND.address.postalCode}, USA
- Phone (call or text): ${SALON.phone}
- Hours: Monday–Sunday, 8:00 AM – 7:00 PM (by appointment)
- Serves: adults and kids; clients from ${BRAND.areaServed.join(", ")}
- Booking: online at ${url}/book — choose a style, pick a time, pay a $30 non-refundable deposit to lock the slot
- Balance payments: online at ${url}/pay (email or booking code) or at the appointment
- Online payments: Visa, Mastercard, Amex, Discover, Apple Pay and Link via Stripe (USD)
- Deposits can also be paid by Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle}) — text ${SALON.phone}
- Instagram: ${SALON.socials.instagram}
- TikTok: ${SALON.socials.tiktok}
- YouTube: ${SALON.socials.youtube}

## Styles offered
${BRAND.styles.map((s) => `- ${s}`).join("\n")}

## Style menu and prices (USD, live)
${menu}

## Booking policies
${policiesText}

## Frequently asked questions
${faqText}

## Pages
- [Home](${url}/): popular styles, gallery, studio tour, location
- [Style menu](${url}/styles): every style by category, with prices
- [FAQ](${url}/faq): all questions by topic
- [Book an appointment](${url}/book)
- [Pay a remaining balance](${url}/pay)
- [Booking policies](${url}/policies)
- [Terms & Conditions](${url}/terms)
- [Privacy policy](${url}/privacy)
`;
}
