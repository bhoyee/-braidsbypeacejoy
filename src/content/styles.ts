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
// • hair       "bring" = hair not provided (client brings it), "none" = no hair/colour
//              add-ons (e.g. take-out). Leave out for the normal hair options.
// • note       short line shown on the menu and when booking, e.g. "Please bring your boho hair".
// • durationMin  how long the appointment blocks the diary — keep these realistic.
// • hidden     true = removed from the site but kept for past bookings.
//
// After editing, commit and push to main: the deploy syncs this list into the
// database automatically (prisma/seed.ts).
// Prices are the salon's price list. Durations: 4 hours each (owner's rule), except where stated.
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: "knotless", label: "Knotless" },
  { id: "boho", label: "Boho & Curly" },
  { id: "box", label: "Box Braids" },
  { id: "cornrows", label: "Cornrows & Stitch" },
  { id: "twists-locs", label: "Twists & Crochet" },
  { id: "kids", label: "Kids" },
  { id: "men-more", label: "Men & Take-Out" },
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
  hair?: "included" | "bring" | "none";
  note?: string;
  popular?: boolean;
  hidden?: boolean;
};

const BRING_BOHO = "Please bring your boho (curly) hair.";
const HAIR_NOT_PROVIDED = "Hair not provided — please bring your own.";

export const STYLES: StyleEntry[] = [
  // ── Knotless ──────────────────────────────────────────────────────────
  {
    slug: "large-knotless",
    name: "Large Knotless Braids (Mid-back)",
    category: "knotless",
    priceCents: 20000,
    durationMin: 240,
    imageUrl: "/assets/styles/large-knotless.jpg",
    description: "Bold, lightweight braids with tension-free roots, mid-back length.",
  },
  {
    slug: "medium-large-knotless",
    name: "Medium-Large Knotless Braids (Mid-back)",
    category: "knotless",
    priceCents: 22000,
    durationMin: 240,
    imageUrl: "/assets/styles/medium-large-knotless.jpg",
    description: "The sweet spot between bold and classic — quicker install, mid-back length.",
  },
  {
    slug: "medium-knotless",
    name: "Medium Knotless Braids (Mid-back)",
    category: "knotless",
    priceCents: 24000,
    durationMin: 240,
    imageUrl: "/assets/styles/medium-knotless.jpg",
    popular: true,
    description: "The signature everyday luxury braid — painless roots, flawless parts.",
  },
  {
    slug: "smedium-knotless",
    name: "Smedium Knotless Braids",
    category: "knotless",
    priceCents: 25000,
    durationMin: 240,
    imageUrl: "/assets/styles/smedium-knotless.jpg",
    popular: true,
    note: "Price depends on the length.",
    description: "Small-medium knotless braids — fuller than small, neater than medium.",
  },
  {
    slug: "small-knotless",
    name: "Small Knotless Braids (Mid-back)",
    category: "knotless",
    priceCents: 30000,
    durationMin: 240,
    imageUrl: "/assets/styles/small-knotless.jpg",
    popular: true,
    description: "Featherlight, ultra-neat knotless parts for a long-lasting, refined finish.",
  },
  {
    slug: "xtra-small-knotless",
    name: "Extra Small Knotless Braids",
    category: "knotless",
    priceCents: 40000,
    durationMin: 480,
    imageUrl: "/assets/styles/xtra-small-knotless.jpg",
    note: "7 to 8 hours, depending on the length.",
    description: "Micro-fine knotless braids for maximum versatility and a long-lasting style.",
  },
  {
    slug: "jumbo-knotless-waist",
    name: "Jumbo Knotless Braids (Waist length)",
    category: "knotless",
    priceCents: 18000,
    durationMin: 240,
    imageUrl: "/assets/styles/jumbo-knotless-waist.jpg",
    description: "Statement jumbo braids down to the waist — quick to install, easy to wear.",
  },
  {
    slug: "short-bob-knotless",
    name: "Short Bob Braids (Shoulder length)",
    category: "knotless",
    priceCents: 20000,
    durationMin: 240,
    imageUrl: "/assets/styles/short-bob-knotless.jpg",
    description: "A chic shoulder-length bob — light, playful and low-maintenance.",
  },

  // ── Boho & curly ──────────────────────────────────────────────────────
  {
    slug: "boho-knotless",
    name: "Medium Bohemian Knotless Braids",
    category: "boho",
    priceCents: 27000,
    durationMin: 240,
    imageUrl: "/assets/styles/boho-knotless.jpg",
    popular: true,
    description: "Knotless braids with soft curls throughout for an effortless goddess look.",
  },
  {
    slug: "small-medium-boho-knotless",
    name: "Small-Medium Bohemian Knotless Braids",
    category: "boho",
    priceCents: 28000,
    durationMin: 240,
    imageUrl: "/assets/styles/small-medium-boho-knotless.jpg",
    description: "Finer boho knotless braids with flowing curls — extra full and feminine.",
  },
  {
    slug: "bora-bora-braids",
    name: "Bora Bora Braids (Medium)",
    category: "boho",
    priceCents: 40000,
    durationMin: 240,
    imageUrl: "/assets/styles/bora-bora-braids.jpg",
    hairBundles: 4,
    popular: true,
    note: BRING_BOHO,
    description: "Knotless braids with full, flowing curls throughout.",
  },
  {
    slug: "bora-bora-braids-smedium",
    name: "Bora Bora Braids (Smedium)",
    category: "boho",
    priceCents: 42000,
    durationMin: 240,
    imageUrl: "/assets/styles/bora-bora-braids-smedium.jpg",
    hairBundles: 4,
    note: BRING_BOHO,
    description: "Smaller Bora Bora braids with curls throughout for an extra-full finish.",
  },
  {
    slug: "mermaid-braids",
    name: "Mermaid Braids",
    category: "boho",
    priceCents: 38000,
    durationMin: 240,
    imageUrl: "/assets/styles/mermaid-braids.jpg",
    hairBundles: 3,
    popular: true,
    note: BRING_BOHO,
    description: "Braids with soft, wavy mermaid curls left out for a romantic finish.",
  },

  // ── Box braids ────────────────────────────────────────────────────────
  {
    slug: "medium-box-braids",
    name: "Medium Box Braids",
    category: "box",
    priceCents: 23000,
    durationMin: 240,
    imageUrl: "/assets/styles/medium-box-braids.jpg",
    description: "Classic box braids with crisp square parts.",
  },
  {
    slug: "small-box-braids",
    name: "Small Box Braids",
    category: "box",
    priceCents: 26000,
    durationMin: 240,
    imageUrl: "/assets/styles/small-box-braids.jpg",
    description: "Fine, neat box braids that last and style beautifully.",
  },

  // ── Cornrows & stitch ─────────────────────────────────────────────────
  {
    slug: "fulani-braids",
    name: "Tribal / Fulani Braids",
    category: "cornrows",
    priceCents: 24000,
    durationMin: 240,
    imageUrl: "/assets/styles/fulani-braids.jpg",
    popular: true,
    description: "Iconic cornrow-and-braid pattern with optional beads and cuffs.",
  },
  {
    slug: "three-layer-cornrows",
    name: "3-Layer Cornrows",
    category: "cornrows",
    priceCents: 27000,
    durationMin: 240,
    imageUrl: "/assets/styles/three-layer-cornrows.jpg",
    description: "Three tiers of sleek cornrows for a bold, sculpted look.",
  },
  {
    slug: "small-ponytail-cornrows",
    name: "Small Ponytail Cornrows",
    category: "cornrows",
    priceCents: 20000,
    durationMin: 240,
    imageUrl: "/assets/styles/small-ponytail-cornrows.jpg",
    description: "Small cornrows swept up into a long, polished ponytail.",
  },
  {
    slug: "small-straight-back-cornrows",
    name: "Small Straight-Back Cornrows",
    category: "cornrows",
    priceCents: 19000,
    durationMin: 240,
    imageUrl: "/assets/styles/small-straight-back-cornrows.jpg",
    description: "Neat, small cornrows braided straight back.",
  },
  {
    slug: "updo-braids",
    name: "Updo",
    category: "cornrows",
    priceCents: 17000,
    durationMin: 240,
    imageUrl: "/assets/styles/updo-braids.jpg",
    note: "Extra $20 for longer length.",
    description: "An elegant braided updo — sleek, sculpted and ready for any occasion.",
  },
  {
    slug: "stitch-braids",
    name: "6 Stitch Braids",
    category: "cornrows",
    priceCents: 12000,
    durationMin: 240,
    imageUrl: "/assets/styles/stitch-braids.jpg",
    note: "6 stitch braids at $20 each.",
    description: "Crisp stitched feed-in braids with a sleek, sculpted finish.",
  },

  // ── Twists & crochet ──────────────────────────────────────────────────
  {
    slug: "island-twist-smedium",
    name: "Island Twist — Smedium (Mid-back)",
    category: "twists-locs",
    priceCents: 26000,
    durationMin: 240,
    imageUrl: "/assets/styles/island-twist-smedium.jpg",
    description: "Lightweight twists with a soft, curly finish, mid-back length.",
  },
  {
    slug: "medium-senegalese-twist",
    name: "Medium Senegalese Twist",
    category: "twists-locs",
    priceCents: 23000,
    durationMin: 240,
    imageUrl: "/assets/styles/medium-senegalese-twist.jpg",
    description: "Sleek, rope-like twists with a smooth, glossy finish.",
  },
  {
    slug: "kinky-twist",
    name: "Kinky Twist",
    category: "twists-locs",
    priceCents: 23000,
    durationMin: 240,
    imageUrl: "/assets/styles/kinky-twist.jpg",
    hair: "bring",
    note: HAIR_NOT_PROVIDED,
    description: "Textured twists that blend naturally with your own hair.",
  },
  {
    slug: "passion-twist",
    name: "Passion Twist",
    category: "twists-locs",
    priceCents: 20000,
    durationMin: 240,
    imageUrl: "/assets/styles/passion-twist.jpg",
    hair: "bring",
    note: HAIR_NOT_PROVIDED,
    description: "Bohemian, springy twists with a soft, romantic texture.",
  },
  {
    slug: "crochet",
    name: "Crochet",
    category: "twists-locs",
    priceCents: 13000,
    durationMin: 240,
    imageUrl: "/assets/styles/crochet.jpg",
    hair: "bring",
    note: HAIR_NOT_PROVIDED,
    description: "A quick, versatile protective style installed with crochet hair.",
  },

  // ── Kids ──────────────────────────────────────────────────────────────
  {
    slug: "kids-braids",
    name: "Kids Knotless Braids (6–12 years)",
    category: "kids",
    priceCents: 16000,
    durationMin: 240,
    imageUrl: "/assets/styles/kids-braids.jpg",
    popular: true,
    description: "Gentle knotless braids designed for little ones aged 6 to 12.",
  },
  {
    slug: "kids-cornrows",
    name: "Kids Cornrows (8–13 years)",
    category: "kids",
    priceCents: 10000,
    durationMin: 240,
    imageUrl: "/assets/styles/kids-cornrows.jpg",
    description: "Neat, gentle cornrows for kids aged 8 to 13.",
  },

  // ── Men & take-out ────────────────────────────────────────────────────
  {
    slug: "men-braids",
    name: "Men Braids",
    category: "men-more",
    priceCents: 10000,
    durationMin: 240,
    imageUrl: "/assets/styles/men-braids.jpg",
    hair: "none",
    note: "Price depends on the style — from $80.",
    description: "Clean, sharp braids and cornrows for men.",
  },
  {
    slug: "braids-take-out",
    name: "Braids Take-Out",
    category: "men-more",
    priceCents: 10000,
    durationMin: 240,
    imageUrl: "/assets/styles/braids-take-out.jpg",
    hair: "none",
    description: "Careful removal of your old braids, gentle on your hair and edges.",
  },
];
