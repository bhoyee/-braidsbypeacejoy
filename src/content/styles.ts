// ─────────────────────────────────────────────────────────────────────────────
// THE STYLE MENU: edit this list to add, change or hide styles.
//
// • One entry per style. The order here is the order on the site.
// • slug       unique id used in links (lowercase-with-dashes). Don't change it
//              after a style has bookings; add a new style instead.
// • category   one of the CATEGORIES ids below.
// • popular    true = shown in "Popular Styles" on the home page (keep it to ~8).
// • priceCents price in cents ($250.00 = 25000).
// • hairBundles  set only if the style always uses a fixed number of bundles.
// • hidden     true = removed from the site but kept for past bookings.
//
// After editing, commit and push to main: the deploy syncs this list into the
// database automatically (prisma/seed.ts).
// ⚠️ Prices and times below are placeholders — replace with the real price list.
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: "knotless", label: "Knotless" },
  { id: "boho", label: "Boho & Curly" },
  { id: "box", label: "Box Braids" },
  { id: "cornrows", label: "Cornrows & Stitch" },
  { id: "twists-locs", label: "Twists & Locs" },
  { id: "kids", label: "Kids" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type StyleEntry = {
  slug: string;
  name: string;
  category: CategoryId;
  priceCents: number;
  durationMin: number;
  description?: string;
  imageUrl?: string;
  hairBundles?: number;
  popular?: boolean;
  hidden?: boolean;
};

export const STYLES: StyleEntry[] = [
  {
    slug: "medium-knotless",
    name: "Medium Knotless Braids",
    category: "knotless",
    priceCents: 25000,
    durationMin: 300,
    imageUrl: "/assets/pix3.jpeg",
    popular: true,
    description: "The signature everyday luxury braid — painless roots, flawless parts.",
  },
  {
    slug: "boho-knotless",
    name: "Boho Knotless Braids",
    category: "boho",
    priceCents: 30000,
    durationMin: 330,
    popular: true,
    description: "Knotless braids with soft human-hair curls for an effortless goddess look.",
  },
  {
    slug: "small-knotless",
    name: "Small Knotless Braids",
    category: "knotless",
    priceCents: 35000,
    durationMin: 360,
    popular: true,
    description: "Featherlight, ultra-neat knotless parts for a long-lasting, refined finish.",
  },
  {
    slug: "bora-bora-braids",
    name: "Bora Bora Braids",
    category: "boho",
    priceCents: 30000,
    durationMin: 360,
    hairBundles: 4,
    popular: true,
    description: "Knotless braids with full, flowing curls throughout — uses 4 bundles of hair.",
  },
  {
    slug: "fulani-braids",
    name: "Fulani Braids",
    category: "cornrows",
    priceCents: 22000,
    durationMin: 240,
    imageUrl: "/assets/pix1.jpeg",
    popular: true,
    description: "Iconic cornrow-and-braid pattern with optional beads and cuffs.",
  },
  {
    slug: "mermaid-braids",
    name: "Mermaid Braids",
    category: "boho",
    priceCents: 28000,
    durationMin: 330,
    hairBundles: 3,
    popular: true,
    description: "Braids with soft, wavy mermaid curls left out for a romantic finish — uses 3 bundles of hair.",
  },
  {
    slug: "stitch-braids",
    name: "Stitch Feed-In Braids",
    category: "cornrows",
    priceCents: 12000,
    durationMin: 150,
    popular: true,
    description: "Crisp stitched cornrows with a sleek, sculpted finish.",
  },
  {
    slug: "kids-braids",
    name: "Kids Braids (12 & under)",
    category: "kids",
    priceCents: 15000,
    durationMin: 180,
    popular: true,
    description: "Gentle, protective styles designed for little ones.",
  },
  {
    slug: "large-knotless",
    name: "Large Knotless Braids",
    category: "knotless",
    priceCents: 20000,
    durationMin: 240,
    description: "Bold, lightweight statement braids installed with tension-free roots.",
  },
  {
    slug: "boho-locs",
    name: "Boho Locs",
    category: "twists-locs",
    priceCents: 28000,
    durationMin: 300,
    description: "Distressed faux locs woven with curly accents for a romantic boho texture.",
  },
];
