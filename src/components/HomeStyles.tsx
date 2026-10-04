"use client";

import Link from "next/link";
import { useState } from "react";
import { categoryTabs, popularStyles, stylesHref, HOME_POPULAR_COUNT } from "@/lib/catalog";
import type { PublicService } from "@/lib/services";
import { ServiceCard } from "./ServiceCard";
import { ArrowRightIcon } from "./icons";

/**
 * Home-page "Popular Styles": the category tabs filter the cards right here
 * (the full /styles page is one tap away under the cards).
 */
export function HomeStyles({ services }: { services: PublicService[] }) {
  const [tab, setTab] = useState("popular");
  const tabs = [{ id: "popular", label: "Popular", count: popularStyles(services).length }, ...categoryTabs(services).slice(1)];
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const inTab = tab === "popular" ? popularStyles(services) : services.filter((s) => s.category === tab);
  const shown = inTab.slice(0, HOME_POPULAR_COUNT);
  const moreInTab = tab !== "popular" && inTab.length > shown.length; // e.g. 9+ knotless styles

  return (
    <>
      <div className="-mx-4 mb-10 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Style categories" className="mx-auto flex w-max gap-2">
          {tabs.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="home-styles-panel"
                onClick={(e) => {
                  setTab(t.id);
                  // On phones the tab row scrolls sideways: keep the chosen tab in view.
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                }}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  selected ? "bg-royal-700 text-white shadow-md shadow-royal-700/30" : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"
                }`}
              >
                {t.label} <span className={selected ? "text-white/60" : "text-navy-900/40"}>· {t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="home-styles-panel" role="tabpanel" aria-label={`${active.label} styles`}>
        {/* Phones & tablets: one swipeable row. Desktop: rows of 4. */}
        <div
          key={tab}
          className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((s, i) => (
            <div key={s.id} className="w-[78%] max-w-[320px] shrink-0 snap-start sm:w-[45%] lg:w-auto lg:max-w-none">
              <ServiceCard service={s} index={i} />
            </div>
          ))}
        </div>
        {shown.length > 1 && <p className="mt-2 text-center text-xs text-navy-900/50 lg:hidden">Swipe to see more →</p>}
      </div>

      <div className="mt-10 text-center">
        <Link
          href={moreInTab ? stylesHref({ category: tab }) : "/styles"}
          className="inline-flex items-center gap-2 rounded-full bg-royal-700 px-8 py-4 font-semibold text-white shadow-lg shadow-royal-700/30 transition hover:bg-navy-900"
        >
          {moreInTab ? `View all ${inTab.length} ${active.label} styles` : `View all ${services.length} styles`}
          <ArrowRightIcon width={18} height={18} />
        </Link>
      </div>
    </>
  );
}
