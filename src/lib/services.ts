import "server-only";

export type PublicService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  durationMin: number;
  hairBundles: number | null;
};

/** Read the active style menu straight from MySQL. Used by the API host. */
export async function listServicesFromDb(): Promise<PublicService[]> {
  const { prisma } = await import("./prisma");
  return prisma.service.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      priceCents: true,
      durationMin: true,
      hairBundles: true,
    },
  });
}

/**
 * Style menu for server-rendered pages.
 * - With API_ORIGIN set (optional split hosting): fetch from that API, cached (ISR).
 * - On the API host / local dev: read the database directly.
 * Never throws — the page renders a graceful empty state instead.
 */
export async function getServices(): Promise<PublicService[]> {
  try {
    const origin = process.env.API_ORIGIN;
    if (origin) {
      const res = await fetch(`${origin.replace(/\/$/, "")}/api/services`, {
        next: { revalidate: 300, tags: ["services"] },
      });
      if (!res.ok) throw new Error(`services API responded ${res.status}`);
      const data = (await res.json()) as { services: PublicService[] };
      return data.services;
    }
    return await listServicesFromDb();
  } catch (err) {
    console.error("[getServices]", err);
    return [];
  }
}
