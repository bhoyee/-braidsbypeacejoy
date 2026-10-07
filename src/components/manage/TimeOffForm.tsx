"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addTimeOffAction, type TimeOffState } from "@/app/manage/actions";
import { useConfirm } from "./ConfirmDialog";

const input =
  "w-full rounded-xl border border-navy-900/15 bg-cream/60 px-4 py-2.5 text-navy-900 outline-none focus:border-royal-700 focus:bg-white focus:ring-4 focus:ring-royal-700/10";

const KINDS = [
  { id: "day", label: "Whole day" },
  { id: "range", label: "Several days" },
  { id: "part", label: "Part of a day" },
] as const;

/** Opening hours in 30-minute steps (8:00 AM – 7:00 PM) for the "part of a day" pickers. */
const TIMES = Array.from({ length: 23 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  const h = Math.floor(m / 60);
  const value = `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const label = `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return { value, label };
});

function Result({ state }: { state: TimeOffState }) {
  if (!state) return null;
  if (!state.ok) return <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">✓ {state.message}</p>
      {state.clashes.length > 0 && (
        <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900 ring-1 ring-orange-200">
          <p className="font-semibold">
            ⚠️ {state.clashes.length} booking{state.clashes.length === 1 ? " is" : "s are"} already in this time — they were not changed.
          </p>
          <p className="mt-1">Open each one to reschedule or cancel it (the client is emailed automatically):</p>
          <ul className="mt-2 space-y-1">
            {state.clashes.map((c) => (
              <li key={c.id}>
                <Link href={`/manage/b/${c.id}`} className="font-semibold text-royal-700 hover:underline">
                  {c.clientName}
                </Link>{" "}
                — {c.service.name},{" "}
                {new Date(c.appointmentAt).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Add time off: whole day, several days, or part of a day. */
export function TimeOffForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<TimeOffState, FormData>(addTimeOffAction, null);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("day");
  const [from, setFrom] = useState("");

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
      <h2 className="font-display text-xl text-navy-900">Block time</h2>
      <p className="mt-1 text-sm text-navy-900/60">Clients won&apos;t be able to book inside this time. Existing bookings are never changed.</p>

      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              kind === k.id ? "bg-purple-700 text-white" : "bg-cream text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="kind" value={kind} />
        {kind === "day" && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-navy-900">Date</span>
            <input type="date" name="date" min={today} required className={input} />
          </label>
        )}
        {kind === "range" && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-navy-900">From</span>
              <input type="date" name="from" min={today} required value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-navy-900">To (including)</span>
              <input type="date" name="to" min={from || today} required className={input} />
            </label>
          </>
        )}
        {kind === "part" && (
          <>
            <label className="block sm:col-span-2 sm:max-w-xs">
              <span className="mb-1 block text-sm font-semibold text-navy-900">Date</span>
              <input type="date" name="date" min={today} required className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-navy-900">From</span>
              <select name="fromTime" required defaultValue="13:00" className={input}>
                {TIMES.slice(0, -1).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-navy-900">To</span>
              <select name="toTime" required defaultValue="16:00" className={input}>
                {TIMES.slice(1).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-navy-900">Private note (optional)</span>
          <input name="note" maxLength={120} placeholder="e.g. Vacation · Doctor's appointment" className={input} />
        </label>
        <button disabled={pending} className="rounded-full bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
          {pending ? "Saving…" : "Block this time"}
        </button>
      </form>
      <Result state={state} />
    </section>
  );
}

/** One tap: stop new bookings for the rest of today. */
export function RestOfTodayButton() {
  const [state, action, pending] = useActionState<TimeOffState, FormData>(addTimeOffAction, null);
  const { guard, dialog } = useConfirm();
  return (
    <form
      action={action}
      onSubmit={(e) =>
        guard(e, {
          title: "Block the rest of today?",
          message: "Clients won't be able to book any more times today. Bookings already made for today stay as they are.",
          confirmLabel: "Block rest of today",
          tone: "warning",
        })
      }
    >
      {dialog}
      <input type="hidden" name="kind" value="rest-of-today" />
      <input type="hidden" name="note" value="Rest of today" />
      <button disabled={pending} className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
        {pending ? "Blocking…" : "⏸ Block the rest of today"}
      </button>
      <Result state={state} />
    </form>
  );
}
