"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { browseStyles, categoryLabel, categoryTabs } from "@/lib/catalog";
import type { PublicService } from "@/lib/services";
import { formatDuration, formatUSD } from "@/lib/time";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, CrownIcon, SearchIcon } from "../icons";

const PER_PAGE = 9; // 3 rows of 3

/** Booking step 1: category tabs + search + pages of 9, so long menus stay manageable. */
export function StylePicker({
  services,
  selectedId,
  onSelect,
}: {
  services: PublicService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = services.find((s) => s.id === selectedId) ?? null;
  const [category, setCategory] = useState(selected?.category ?? "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(() => {
    // Open on the page that contains an already-chosen style (same ordering as the list).
    if (!selected) return 1;
    const first = browseStyles(services, { category: selected.category, sort: "popular", pageSize: PER_PAGE });
    for (let p = 1; p <= first.pageCount; p++) {
      const v = browseStyles(services, { category: selected.category, sort: "popular", page: p, pageSize: PER_PAGE });
      if (v.items.some((s) => s.id === selected.id)) return p;
    }
    return 1;
  });

  const tabs = useMemo(() => categoryTabs(services), [services]);
  const view = useMemo(
    () => browseStyles(services, { category: q ? "all" : category, q, sort: "popular", page, pageSize: PER_PAGE }),
    [services, category, q, page],
  );
  const items = view.items;

  return (
    <div>
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-700" />
        <label htmlFor="book-style-search" className="sr-only">Search styles</label>
        <input
          id="book-style-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search styles…"
          className="w-full rounded-full border border-navy-900/15 bg-white py-3 pl-12 pr-4 text-navy-900 outline-none transition focus:border-royal-700 focus:ring-4 focus:ring-royal-700/10"
        />
      </div>

      {!q && (
        <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-2">
            {tabs.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(t.id);
                    setPage(1);
                  }}
                  aria-pressed={t.id === category}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    t.id === category ? "bg-royal-700 text-white" : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[11px] ${t.id === category ? "bg-white/20" : "bg-navy-900/5 text-navy-900/60"}`}>{t.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && !items.some((s) => s.id === selected.id) && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-gold-200/50 px-4 py-3 text-sm text-navy-900">
          <CheckIcon width={16} height={16} className="text-royal-700" /> Selected: <strong>{selected.name}</strong>
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-navy-900/60">No styles match “{q}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={`group flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-2 transition hover:-translate-y-0.5 hover:shadow-xl ${
                  active ? "ring-gold-400" : "ring-transparent hover:ring-royal-700/30"
                }`}
              >
                {/* Photo (or the brand placeholder) with price, category, note and name — like the style menu */}
                <span className="relative block aspect-[4/3] overflow-hidden bg-navy-900">
                  {s.imageUrl ? (
                    <Image
                      src={s.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <span className="braid-texture absolute inset-0 flex items-center justify-center bg-gradient-to-br from-royal-700 via-navy-900 to-navy-950">
                      <CrownIcon width={48} height={48} className="text-gold-400/70" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-bold text-navy-950 shadow">
                    {formatUSD(s.priceCents)}
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-navy-950/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                    {categoryLabel(s.category)}
                  </span>
                  <span className="absolute inset-x-3 bottom-3 space-y-1.5">
                    {s.note && (
                      <span className="inline-block rounded-lg bg-gold-400/95 px-2 py-0.5 text-[10px] font-bold leading-snug text-navy-950">💡 {s.note}</span>
                    )}
                    <span className="block font-display text-xl font-semibold leading-tight text-white">{s.name}</span>
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-1 text-sm text-navy-900/60">
                    <ClockIcon width={14} height={14} /> {formatDuration(s.durationMin)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold ${
                      active ? "bg-gold-400 text-navy-950" : "bg-royal-700 text-white group-hover:bg-gold-400 group-hover:text-navy-950"
                    }`}
                  >
                    {active ? (
                      <>
                        <CheckIcon width={14} height={14} /> Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {view.pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={view.page <= 1}
            onClick={() => setPage(view.page - 1)}
            className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-royal-700 ring-1 ring-navy-900/10 transition hover:bg-royal-700 hover:text-white disabled:opacity-30"
          >
            <ChevronLeftIcon width={16} height={16} /> Prev
          </button>
          <span className="text-sm text-navy-900/60">
            Page {view.page} of {view.pageCount}
          </span>
          <button
            type="button"
            disabled={view.page >= view.pageCount}
            onClick={() => setPage(view.page + 1)}
            className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-royal-700 ring-1 ring-navy-900/10 transition hover:bg-royal-700 hover:text-white disabled:opacity-30"
          >
            Next <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}
