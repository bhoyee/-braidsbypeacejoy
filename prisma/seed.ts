// Sync the style menu from src/content/styles.ts into the database.
// Runs automatically on every deploy (deploy/server-deploy.sh) and via `npm run db:seed`.
//
// • New styles are added, existing ones (matched by slug) are updated.
// • Styles removed from the list (or marked hidden) are hidden, never deleted,
//   so past bookings keep their style.
import { PrismaClient } from "@prisma/client";
import { STYLES } from "../src/content/styles";

// Keep Prisma's engine within shared-hosting thread limits (see src/lib/prisma.ts).
process.env.TOKIO_WORKER_THREADS ??= "2";
const prisma = new PrismaClient();

async function main() {
  const slugs = new Set<string>();
  for (const [i, s] of STYLES.entries()) {
    if (slugs.has(s.slug)) throw new Error(`Duplicate style slug "${s.slug}" in src/content/styles.ts`);
    slugs.add(s.slug);
    const data = {
      name: s.name,
      category: s.category,
      priceCents: s.priceCents,
      durationMin: s.durationMin,
      description: s.description ?? null,
      imageUrl: s.imageUrl ?? null,
      hairBundles: s.hairBundles ?? null,
      popular: s.popular ?? false,
      active: !s.hidden,
      sortOrder: i,
    };
    await prisma.service.upsert({ where: { slug: s.slug }, update: data, create: { slug: s.slug, ...data } });
  }
  const hidden = await prisma.service.updateMany({
    where: { slug: { notIn: [...slugs] }, active: true },
    data: { active: false, popular: false },
  });
  const shown = STYLES.filter((s) => !s.hidden).length;
  console.log(`Style menu synced: ${shown} shown${hidden.count ? `, ${hidden.count} no longer listed (hidden)` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
