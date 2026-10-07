"use client";

import type { Slot, SlotStatus } from "@/lib/availability";

const REASON: Record<Exclude<SlotStatus, "available">, string> = {
  booked: "Already booked",
  unavailable: "Not available",
  "after-hours": "Would run past 7:00 PM closing",
  past: "No longer available",
};

const GROUPS = [
  { label: "Morning", from: "00:00", to: "12:00" },
  { label: "Afternoon", from: "12:00", to: "17:00" },
  { label: "Evening", from: "17:00", to: "24:00" },
];

type Props = {
  slots: Slot[] | null;
  loading: boolean;
  error: string | null;
  value: string | null; // startsAt ISO
  onChange: (startsAt: string) => void;
};

export function TimeSlots({ slots, loading, error, value, onChange }: Props) {
  if (loading)
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-navy-900/5" />
        ))}
      </div>
    );
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!slots) return <p className="rounded-xl bg-cream p-6 text-center text-sm text-navy-900/60">Select a date to see open times.</p>;

  const openCount = slots.filter((s) => s.status === "available").length;
  // Why nothing is open: the owner's time off, or simply too late in the day.
  const closedAllDay = slots.some((s) => s.status === "unavailable") && slots.every((s) => s.status === "unavailable" || s.status === "past");
  const allPassed = slots.every((s) => s.status === "past" || s.status === "after-hours");

  return (
    <div className="space-y-5">
      {openCount === 0 && (
        <p className="rounded-xl bg-gold-200/50 p-4 text-sm font-medium text-navy-900">
          {closedAllDay
            ? "We're not taking bookings on this day. Please choose another date."
            : allPassed
              ? "No more times are available today. Please choose another date."
              : "This day is fully booked for the selected style. Please choose another date."}
        </p>
      )}
      {GROUPS.map((g) => {
        const group = slots.filter((s) => s.time >= g.from && s.time < g.to);
        if (!group.length) return null;
        return (
          <div key={g.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-royal-700/70">{g.label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.map((s) => {
                const disabled = s.status !== "available";
                const selected = s.startsAt === value;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(s.startsAt)}
                    title={disabled ? REASON[s.status as Exclude<SlotStatus, "available">] : `Book ${s.label}`}
                    aria-pressed={selected}
                    className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${
                      selected
                        ? "bg-gold-400 text-navy-950 shadow-lg shadow-gold-500/40 ring-2 ring-gold-500"
                        : disabled
                          ? s.status === "booked" || s.status === "unavailable"
                            ? "cursor-not-allowed bg-navy-900/10 text-navy-900/25 line-through"
                            : "cursor-not-allowed bg-navy-900/[0.04] text-navy-900/25"
                          : "bg-white text-royal-700 ring-1 ring-royal-700/25 hover:bg-royal-700 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 border-t border-navy-900/10 pt-4 text-xs text-navy-900/60">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-white ring-1 ring-royal-700/40" /> Open</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-gold-400" /> Selected</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-navy-900/10" /> Booked</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-navy-900/[0.04] ring-1 ring-navy-900/10" /> Outside hours / unavailable</span>
      </div>
    </div>
  );
}
