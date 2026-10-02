// Single source of truth for SEO / social / AI-search content. The visible FAQ,
// the JSON-LD structured data and /llms.txt all read from here so they never disagree.
import { DEPOSIT_CENTS, SALON } from "./config";
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

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Where is Braids by Peace Joy located?",
    a: "We're inside PHENIX Salon Suites at 8700 Liberty Rd, Suite 101, Randallstown, MD 21133. Look for our posters in the suite window.",
  },
  {
    q: "What are your opening hours?",
    a: "We're open 7 days a week, Monday to Sunday, from 8:00 AM to 7:00 PM, by appointment. Every style is scheduled to finish by 7:00 PM.",
  },
  {
    q: "How do I book an appointment?",
    a: `Book online in a few minutes: choose your style, pick an open date and time, and pay the $30 deposit to lock your slot. You can also call or text ${SALON.phone}.`,
  },
  {
    q: "Is a deposit required, and is it refundable?",
    a: `Yes. A strict, non-refundable deposit of ${formatUSD(DEPOSIT_CENTS)} USD is required to secure and block your appointment slot, and it counts toward your style's total price. Pay it online by card, Apple Pay or Link when you book, or by Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle}) by texting us. A no call / no show cancels the appointment and forfeits the deposit.`,
  },
  {
    q: "Can I cancel or reschedule my appointment?",
    a: `Yes — reply to your confirmation email or text ${SALON.phone} at least 72 hours before your appointment. If you cancel less than 72 hours before, you'll need to pay a new deposit to book again.`,
  },
  {
    q: "Is braiding hair included in the price?",
    a: "Yes, all prices include braiding hair, except passion twists and crochet styles. A mix of two or more colors adds $20, and the final price can change with braid length and size. When you book you can upgrade to 100% human hair ($80 per bundle) or blended hair ($50 per bundle), or bring your own hair.",
  },
  {
    q: "How should I prepare for my appointment?",
    a: `Arrive with your hair washed and blow-dried, with no oil or product applied. Your hair should be at least 4 inches long. Tell us about any allergy to braiding hair or products, and call or text ${SALON.phone} if you're running late.`,
  },
  {
    q: "How do I pay the rest of my balance?",
    a: "Pay the remaining balance online at any time on our Pay Balance page using the email you booked with or your booking code, or pay at your appointment.",
  },
  {
    q: "What braiding styles do you offer?",
    a: `Knotless braids, boho knotless braids, box braids, cornrows, stitch braids, Fulani braids, kinky twists, Senegalese twists, mermaid braids, Bora Bora braids and more. See the style menu for current prices and appointment times.`,
  },
  {
    q: "Do you braid children's hair?",
    a: "Yes — we braid for adults and kids. Choose a kids style from the menu when booking.",
  },
  {
    q: "What payment methods do you accept?",
    a: `Online payments are processed securely by Stripe and accept Visa, Mastercard, American Express, Discover, Apple Pay and Link. Deposits can also be sent by Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle}).`,
  },
];

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

  const faq = {
    "@type": "FAQPage",
    "@id": `${url}/#faq`,
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
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

  return { "@context": "https://schema.org", "@graph": [business, website, faq] };
}

/** Plain-text summary for AI assistants / LLM crawlers (served at /llms.txt). */
export function buildLlmsTxt(services: PublicService[]) {
  const url = siteUrl();
  const menu = services.length
    ? services
        .map((s) => `- ${s.name}: ${formatUSD(s.priceCents)} · about ${formatDuration(s.durationMin)}${s.description ? ` — ${s.description}` : ""} (book: ${url}/book?service=${s.slug})`)
        .join("\n")
    : "- See the live style menu at " + `${url}/#styles`;

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
${FAQS.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Pages
- [Home](${url}/): style menu, gallery, studio tour, location and FAQ
- [Book an appointment](${url}/book)
- [Pay a remaining balance](${url}/pay)
- [Booking policies](${url}/policies)
- [Terms & Conditions](${url}/terms)
- [Privacy policy](${url}/privacy)
`;
}
