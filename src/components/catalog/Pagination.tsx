import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

/** Page numbers with Prev/Next. Shows a window like 1 … 4 5 6 … 12 for long lists. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;

  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  const base = "flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition";
  return (
    <nav aria-label="Pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} scroll={false} className={`${base} gap-1 bg-white text-royal-700 ring-1 ring-navy-900/10 hover:bg-royal-700 hover:text-white`}>
          <ChevronLeftIcon width={16} height={16} /> Prev
        </Link>
      ) : (
        <span className={`${base} gap-1 bg-white/60 text-navy-900/30`}>
          <ChevronLeftIcon width={16} height={16} /> Prev
        </span>
      )}
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-navy-900/40">…</span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            scroll={false}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-gold-400 text-navy-950 shadow-md shadow-gold-500/30" : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-royal-700 hover:text-white"}`}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} scroll={false} className={`${base} gap-1 bg-white text-royal-700 ring-1 ring-navy-900/10 hover:bg-royal-700 hover:text-white`}>
          Next <ChevronRightIcon width={16} height={16} />
        </Link>
      ) : (
        <span className={`${base} gap-1 bg-white/60 text-navy-900/30`}>
          Next <ChevronRightIcon width={16} height={16} />
        </span>
      )}
    </nav>
  );
}
