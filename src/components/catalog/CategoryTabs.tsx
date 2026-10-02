import Link from "next/link";
import { RevealActiveTab } from "./RevealActiveTab";

type Tab = { id: string; label: string; count: number };

/** Horizontally scrollable category tabs (swipe on phones). Each tab is a real link. */
export function CategoryTabs({ tabs, active, hrefFor }: { tabs: Tab[]; active: string; hrefFor: (id: string) => string }) {
  return (
    <nav aria-label="Style categories" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={hrefFor(t.id)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-royal-700 text-white shadow-md shadow-royal-700/30"
                    : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60 hover:ring-gold-400"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-white/20" : "bg-navy-900/5 text-navy-900/60"}`}>{t.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <RevealActiveTab selector={'nav[aria-label="Style categories"] [aria-current="page"]'} />
    </nav>
  );
}
