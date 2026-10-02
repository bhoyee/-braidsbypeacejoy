"use client";

import { useMemo, useState } from "react";
import { FAQS, TOPICS } from "@/content/faqs";
import { FaqItem } from "./Faq";
import { SearchIcon } from "./icons";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** /faq page: topic tabs + search over every question. Only one topic is shown at a time. */
export function FaqBrowser() {
  const [topic, setTopic] = useState<string>(TOPICS[0].id);
  const [q, setQ] = useState("");

  const counts = useMemo(() => new Map(TOPICS.map((t) => [t.id, FAQS.filter((f) => f.topic === t.id).length])), []);
  const searching = q.trim().length > 0;
  // Every question stays in the HTML (good for Google / AI); only the visible set changes.
  const visible = useMemo(() => {
    if (!searching) return new Set(FAQS.filter((f) => f.topic === topic));
    const terms = normalize(q.trim()).split(/\s+/);
    return new Set(FAQS.filter((f) => terms.every((t) => normalize(`${f.q} ${f.a}`).includes(t))));
  }, [q, searching, topic]);

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-700" />
        <label htmlFor="faq-search" className="sr-only">Search questions</label>
        <input
          id="faq-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search questions — e.g. deposit, late, kids"
          className="w-full rounded-full border border-navy-900/15 bg-white py-3.5 pl-12 pr-4 text-navy-900 outline-none transition focus:border-royal-700 focus:ring-4 focus:ring-royal-700/10"
        />
      </div>

      {!searching && (
        <nav aria-label="FAQ topics" className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {TOPICS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTopic(t.id)}
                  aria-pressed={t.id === topic}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    t.id === topic
                      ? "bg-royal-700 text-white shadow-md shadow-royal-700/30"
                      : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60 hover:ring-gold-400"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.id === topic ? "bg-white/20" : "bg-navy-900/5 text-navy-900/60"}`}>
                    {counts.get(t.id)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="mt-6 text-sm text-navy-900/60" aria-live="polite">
        {searching ? `${visible.size} result${visible.size === 1 ? "" : "s"} for “${q.trim()}”` : null}
      </p>
      <div className="mt-3 space-y-3">
        {FAQS.map((f) => (
          <div key={f.q} hidden={!visible.has(f)}>
            <FaqItem faq={f} />
          </div>
        ))}
        {searching && visible.size === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-navy-900/70">
            No matching questions. Call or text us — we&apos;re happy to help.
          </p>
        )}
      </div>
    </div>
  );
}
