// Style-menu browsing (isomorphic): category tabs, search, sorting and paging.
// Shared by the home page, /styles and the booking page so they behave the same.
import { CATEGORIES } from "@/content/styles";
import type { PublicService } from "./services";

export const PAGE_SIZE = 12;
export const HOME_POPULAR_COUNT = 8;

export const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "time-asc", label: "Quickest first" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export type CatalogQuery = { category?: string; q?: string; sort?: string; page?: number; pageSize?: number };

/** Builds a /styles URL, leaving out default values so links stay short. */
export function stylesHref(p: { category?: string; q?: string; sort?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (p.category && p.category !== "all") sp.set("category", p.category);
  if (p.q) sp.set("q", p.q);
  if (p.sort && p.sort !== "popular") sp.set("sort", p.sort);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return `/styles${qs ? `?${qs}` : ""}`;
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

/** Tabs to show: "All" + every category that currently has at least one style. */
export function categoryTabs(services: PublicService[]) {
  const counts = new Map<string, number>();
  for (const s of services) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return [
    { id: "all", label: "All styles", count: services.length },
    ...CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id)! })),
    ...(counts.has("other") ? [{ id: "other", label: "Other", count: counts.get("other")! }] : []),
  ];
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function browseStyles(services: PublicService[], query: CatalogQuery) {
  const category = query.category && query.category !== "all" ? query.category : "all";
  const q = (query.q ?? "").trim();
  const sort: SortId = SORTS.some((s) => s.id === query.sort) ? (query.sort as SortId) : "popular";

  let list = category === "all" ? services : services.filter((s) => s.category === category);
  if (q) {
    const terms = normalize(q).split(/\s+/);
    list = list.filter((s) => {
      const hay = normalize(`${s.name} ${s.description ?? ""} ${categoryLabel(s.category)}`);
      return terms.every((t) => hay.includes(t));
    });
  }
  list = [...list];
  if (sort === "popular") list.sort((a, b) => Number(b.popular) - Number(a.popular)); // stable: keeps menu order within groups
  if (sort === "price-asc") list.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "price-desc") list.sort((a, b) => b.priceCents - a.priceCents);
  if (sort === "time-asc") list.sort((a, b) => a.durationMin - b.durationMin);

  const size = query.pageSize ?? PAGE_SIZE;
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(query.page ?? 1) || 1));
  const items = list.slice((page - 1) * size, page * size);
  return { items, total, page, pageCount, category, q, sort };
}

/** Up to `count` styles flagged popular (falls back to the first styles on the menu). */
export function popularStyles(services: PublicService[], count = HOME_POPULAR_COUNT) {
  const popular = services.filter((s) => s.popular);
  return (popular.length ? popular : services).slice(0, count);
}
