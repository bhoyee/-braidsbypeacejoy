import type { Metadata } from "next";
import Link from "next/link";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { Pagination } from "@/components/catalog/Pagination";
import { ServiceCard } from "@/components/ServiceCard";
import { PAGE_SIZE, browseStyles, categoryLabel, categoryTabs, stylesHref } from "@/lib/catalog";
import { getServices } from "@/lib/services";

// Always render from the live menu (prices and new styles show up immediately).
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; q?: string; sort?: string; page?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { category } = await searchParams;
  const named = category && category !== "all" ? categoryLabel(category) : null;
  const title = named ? `${named} Styles & Prices` : "Style Menu & Prices";
  const description = named
    ? `${named} braiding styles at Braids by Peace Joy in Randallstown, MD — prices, appointment times and online booking.`
    : "The full Braids by Peace Joy style menu: knotless, boho, box braids, cornrows, twists, locs and kids styles, with prices and online booking.";
  const canonical = named ? `/styles?category=${encodeURIComponent(category!)}` : "/styles";
  return { title, description, alternates: { canonical }, openGraph: { url: canonical, title: `${title} | Braids by Peace Joy`, description } };
}

export default async function StylesPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, services] = await Promise.all([searchParams, getServices()]);
  const tabs = categoryTabs(services);
  // A search always covers the whole menu (not just the open tab).
  const view = browseStyles(services, { category: sp.q ? "all" : sp.category, q: sp.q, sort: sp.sort, page: Number(sp.page) || 1 });
  const activeTab = tabs.some((t) => t.id === view.category) ? view.category : "all";
  const from = (view.page - 1) * PAGE_SIZE + 1;

  return (
    <div className="min-h-screen bg-cream pt-[112px]">
      <section className="braid-texture bg-navy-900 px-4 pb-14 pt-12 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">The Style Menu</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
          {activeTab === "all" ? "Choose Your Crown" : categoryLabel(activeTab)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          {services.length} styles · transparent prices and appointment times · book online in minutes.
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="space-y-5">
          <CategoryTabs tabs={tabs} active={activeTab} hrefFor={(id) => stylesHref({ category: id, sort: view.sort })} />
          <CatalogControls category={activeTab} q={view.q} sort={view.sort} />
        </div>

        <p className="mt-8 text-sm text-navy-900/60" aria-live="polite">
          {view.total === 0
            ? "No styles found."
            : `Showing ${from}–${from + view.items.length - 1} of ${view.total} style${view.total === 1 ? "" : "s"}${view.q ? ` for “${view.q}”` : ""}`}
        </p>

        {view.items.length ? (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {view.items.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-display text-2xl text-navy-900">Nothing matches that search.</p>
            <p className="mt-2 text-navy-900/60">Try another word, or browse every style.</p>
            <Link href="/styles" className="mt-6 inline-block rounded-full bg-royal-700 px-6 py-3 font-semibold text-white hover:bg-navy-900">
              Show all styles
            </Link>
          </div>
        )}

        <Pagination
          page={view.page}
          pageCount={view.pageCount}
          hrefFor={(page) => stylesHref({ category: activeTab, q: view.q, sort: view.sort, page })}
        />
      </div>
    </div>
  );
}
