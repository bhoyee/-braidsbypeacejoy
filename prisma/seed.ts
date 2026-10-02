// Seed the style menu. Prices/durations are placeholders — edit to match the
// real Braidsbypeacejoy price list, then run: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const services = [
  { slug: "small-knotless", name: "Small Knotless Braids", priceCents: 35000, durationMin: 360, description: "Featherlight, ultra-neat knotless parts for a long-lasting, refined finish." },
  { slug: "medium-knotless", name: "Medium Knotless Braids", priceCents: 25000, durationMin: 300, imageUrl: "/assets/pix3.jpeg", description: "The signature everyday luxury braid — painless roots, flawless parts." },
  { slug: "large-knotless", name: "Large Knotless Braids", priceCents: 20000, durationMin: 240, description: "Bold, lightweight statement braids installed with tension-free roots." },
  { slug: "boho-knotless", name: "Boho Knotless Braids", priceCents: 30000, durationMin: 330, description: "Knotless braids with soft human-hair curls for an effortless goddess look." },
  { slug: "boho-locs", name: "Boho Locs", priceCents: 28000, durationMin: 300, description: "Distressed faux locs woven with curly accents for a romantic boho texture." },
  { slug: "fulani-braids", name: "Fulani Braids", priceCents: 22000, durationMin: 240, imageUrl: "/assets/pix1.jpeg", description: "Iconic cornrow-and-braid pattern with optional beads and cuffs." },
  { slug: "stitch-braids", name: "Stitch Feed-In Braids", priceCents: 12000, durationMin: 150, description: "Crisp stitched cornrows with a sleek, sculpted finish." },
  { slug: "kids-braids", name: "Kids Braids (12 & under)", priceCents: 15000, durationMin: 180, description: "Gentle, protective styles designed for little ones." },
];

async function main() {
  for (const [i, s] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: { ...s, sortOrder: i },
      create: { ...s, sortOrder: i },
    });
  }
  console.log(`Seeded ${services.length} services.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
