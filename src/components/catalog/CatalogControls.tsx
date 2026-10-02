"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SORTS, stylesHref } from "@/lib/catalog";
import { SearchIcon } from "../icons";

/** Search box (updates results as you type) + sort menu for the /styles page. */
export function CatalogControls({ category, q, sort }: { category: string; q: string; sort: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => setText(q), [q]);

  // Debounced search: the URL (and so the server-rendered results) follows the box.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (text.trim() === q) return;
      // Searching covers every style, so the category is dropped while a search is active.
      startTransition(() => router.replace(stylesHref({ category: text.trim() ? "all" : category, q: text.trim(), sort }), { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
  }, [text, q, category, sort, router]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => router.replace(stylesHref({ category: text.trim() ? "all" : category, q: text.trim(), sort }), { scroll: false }));
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-700" />
        <label htmlFor="style-search" className="sr-only">Search styles</label>
        <input
          id="style-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search styles — e.g. boho, knotless, kids"
          className="w-full rounded-full border border-navy-900/15 bg-white py-3 pl-12 pr-4 text-navy-900 outline-none transition focus:border-royal-700 focus:ring-4 focus:ring-royal-700/10"
        />
        {pending && <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-royal-700 border-t-transparent" />}
      </form>
      <label className="flex items-center gap-2 text-sm text-navy-900/70">
        <span className="shrink-0">Sort by</span>
        <select
          value={sort}
          onChange={(e) => startTransition(() => router.replace(stylesHref({ category, q, sort: e.target.value }), { scroll: false }))}
          className="rounded-full border border-navy-900/15 bg-white px-4 py-3 font-semibold text-navy-900 outline-none focus:border-royal-700"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
