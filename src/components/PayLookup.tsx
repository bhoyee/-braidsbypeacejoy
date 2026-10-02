"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/booking";
import { formatSalonDate, formatSalonTime, formatUSD } from "@/lib/time";
import { CardIcon, SearchIcon } from "./icons";

export function PayLookup({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [searched, setSearched] = useState<string | null>(null);
  const [results, setResults] = useState<PublicBooking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 4) return setError("Enter your email address or booking code (e.g. PJ-7K3Q9X).");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/lookup?q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
      setResults(data.bookings);
      setSearched(term);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) search(initialQuery);
  }, [initialQuery, search]);

  async function pay(bookingId: string) {
    if (!searched) return;
    setPayingId(bookingId);
    setError(null);
    try {
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, q: searched }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setPayingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-2xl shadow-navy-950/30 ring-1 ring-navy-900/10 sm:flex-row"
      >
        <label className="flex flex-1 items-center gap-3 px-3">
          <SearchIcon className="shrink-0 text-royal-700" />
          <span className="sr-only">Email or booking code</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email address or booking code"
            autoComplete="email"
            className="w-full bg-transparent py-3 text-navy-900 outline-none placeholder:text-navy-900/40"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-gold-400 px-8 py-3 font-bold text-navy-950 transition hover:bg-gold-300 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Find my balance"}
        </button>
      </form>

      {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

      {results && (
        <div className="mt-10 space-y-5">
          {results.length === 0 ? (
            <p className="rounded-2xl bg-white/10 p-6 text-center text-white/80 ring-1 ring-white/15">
              No outstanding balance found for <strong className="text-gold-300">{searched}</strong>. You may already be fully
              settled — or try the email you booked with.
            </p>
          ) : (
            results.map((b) => (
              <article key={b.id} className="overflow-hidden rounded-3xl bg-white shadow-xl">
                <header className="flex flex-wrap items-center justify-between gap-2 bg-royal-700 px-6 py-4 text-white">
                  <p className="font-display text-xl font-semibold">{b.serviceName}</p>
                  <span className="rounded-full bg-gold-400 px-3 py-1 font-mono text-xs font-bold text-navy-950">{b.bookingCode}</span>
                </header>
                <div className="p-6">
                  <p className="text-sm text-navy-900/60">
                    {formatSalonDate(b.appointmentAt)} · {formatSalonTime(b.appointmentAt)}
                  </p>
                  <table className="mt-4 w-full text-sm">
                    <tbody className="divide-y divide-navy-900/10">
                      <tr><td className="py-2 text-navy-900/60">{b.serviceName}</td><td className="py-2 text-right font-medium">{formatUSD(b.totalCents - b.addOnsCents)}</td></tr>
                      {b.addOnsCents > 0 && (
                        <tr><td className="py-2 text-navy-900/60">Add-ons: {b.addOnsSummary}</td><td className="py-2 text-right font-medium">+{formatUSD(b.addOnsCents)}</td></tr>
                      )}
                      <tr><td className="py-2 text-navy-900/60">Total</td><td className="py-2 text-right font-medium">{formatUSD(b.totalCents)}</td></tr>
                      <tr><td className="py-2 text-navy-900/60">Deposit &amp; payments received</td><td className="py-2 text-right font-medium text-green-700">− {formatUSD(b.amountPaidCents)}</td></tr>
                      <tr><td className="py-3 font-bold text-navy-900">Pending balance (USD)</td><td className="py-3 text-right text-2xl font-bold text-royal-700">{formatUSD(b.balanceCents)}</td></tr>
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => pay(b.id)}
                    disabled={payingId !== null}
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-gold-400 px-6 py-4 font-bold text-navy-950 transition hover:bg-gold-300 disabled:opacity-60"
                  >
                    <CardIcon />
                    {payingId === b.id ? "Redirecting to secure checkout…" : `Pay ${formatUSD(b.balanceCents)} Now`}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
