"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/booking";
import { SALON } from "@/lib/config";
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
    if (term.length < 4) return setError("Enter your email, phone number or booking code (e.g. PJ-7K3Q9X).");
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
          <span className="sr-only">Email, phone number or booking code</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email, phone or booking code"
            autoComplete="off"
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
              settled — or try the email or phone number you booked with.
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
                  <AltPayment amountCents={b.balanceCents} bookingCode={b.bookingCode} />
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Cash App / Zelle option for one booking. These payments aren't seen by the website,
 *  so the client includes the booking code and texts a screenshot to be marked paid. */
function AltPayment({ amountCents, bookingCode }: { amountCents: number; bookingCode: string }) {
  const amount = (amountCents / 100).toFixed(2).replace(/\.00$/, "");
  return (
    <div className="mt-4 rounded-2xl bg-cream p-4 text-sm text-navy-900">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-navy-900/50">or pay with</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a
          href={`${SALON.cashAppUrl}/${amount}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-[#00d632] px-4 py-3 font-bold text-white transition hover:brightness-95"
        >
          $ Cash App {formatUSD(amountCents)}
        </a>
        <CopyButton value={SALON.zelle} className="bg-[#6d1ed4] text-white hover:brightness-110">
          Zelle {SALON.zelle}
        </CopyButton>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-navy-900/70">
        Cash App: <strong>{SALON.cashApp}</strong> · Zelle: <strong>{SALON.zelle}</strong>. Put your booking code{" "}
        <CopyButton value={bookingCode} inline>
          {bookingCode}
        </CopyButton>{" "}
        in the payment note, then text a screenshot to{" "}
        <a href={SALON.smsHref} className="font-semibold text-royal-700 underline">
          {SALON.phone}
        </a>{" "}
        so we can mark your balance as paid.
      </p>
    </div>
  );
}

function CopyButton({ value, children, className = "", inline = false }: { value: string; children: React.ReactNode; className?: string; inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the value is visible to copy by hand */
    }
  };
  if (inline)
    return (
      <button type="button" onClick={copy} title="Copy" className="rounded bg-navy-900/10 px-1.5 py-0.5 font-mono font-bold text-navy-900 hover:bg-gold-300">
        {copied ? "Copied!" : children}
      </button>
    );
  return (
    <button type="button" onClick={copy} className={`flex items-center justify-center gap-2 rounded-full px-4 py-3 font-bold transition ${className}`}>
      {copied ? "Copied — paste in Zelle" : children}
      {!copied && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Copy</span>}
    </button>
  );
}
