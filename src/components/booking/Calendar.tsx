"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  value: string | null; // "YYYY-MM-DD"
  minKey: string;
  maxKey: string;
  onChange: (dateKey: string) => void;
};

const key = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Month-view date picker. Days outside [minKey, maxKey] are greyed out and unclickable. */
export function Calendar({ value, minKey, maxKey, onChange }: Props) {
  const start = value ?? minKey;
  const [cursor, setCursor] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));

  const { cells, label } = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const lead = first.getUTCDay();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(key(cursor.y, cursor.m, d));
    const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    return { cells, label };
  }, [cursor]);

  const monthKey = key(cursor.y, cursor.m, 1).slice(0, 7);
  const canPrev = monthKey > minKey.slice(0, 7);
  const canNext = monthKey < maxKey.slice(0, 7);
  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-navy-900/10">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="rounded-full p-2 text-navy-900 hover:bg-cream disabled:opacity-25"
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <p className="font-display text-lg font-semibold text-navy-900">{label}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="rounded-full p-2 text-navy-900 hover:bg-cream disabled:opacity-25"
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-royal-700/60">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((k, i) => {
          if (!k) return <span key={`blank-${i}`} />;
          const disabled = k < minKey || k > maxKey;
          const selected = k === value;
          const isToday = k === minKey;
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onChange(k)}
              aria-pressed={selected}
              aria-label={k}
              className={`relative aspect-square rounded-xl text-sm font-medium transition ${
                selected
                  ? "bg-gold-400 font-bold text-navy-950 shadow-md shadow-gold-500/40"
                  : disabled
                    ? "cursor-not-allowed text-navy-900/20 line-through"
                    : "text-navy-900 hover:bg-royal-700 hover:text-white"
              }`}
            >
              {Number(k.slice(8))}
              {isToday && !selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-500" />}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-navy-900/50">Open Monday – Sunday · 8:00 AM – 7:00 PM (Eastern)</p>
    </div>
  );
}
