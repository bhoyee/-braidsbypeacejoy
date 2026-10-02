"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/booking";
import { SALON } from "@/lib/config";
import { formatDuration, formatSalonDate, formatSalonTime, formatUSD } from "@/lib/time";
import { CheckIcon, PinIcon } from "./icons";

type State =
  | { status: "loading" }
  | { status: "processing" }
  | { status: "expired" }
  | { status: "error" }
  | { status: "confirmed" | "refunded"; booking: PublicBooking; kind?: "DEPOSIT" | "BALANCE" };

const MAX_ATTEMPTS = 20; // ~40s

/**
 * Instant payment verification: asks the API (which asks Stripe) whether the
 * session is paid, and keeps polling briefly for async confirmations.
 */
export function CheckoutStatus({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) return setState({ status: "error" });
        if (data.status === "confirmed" || data.status === "refunded" || data.status === "expired") return setState(data);
        setState({ status: "processing" });
      } catch {
        if (cancelled) return;
      }
      if (attempts < MAX_ATTEMPTS) timer = setTimeout(check, 2000);
      else setState({ status: "error" });
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  if (state.status === "loading" || state.status === "processing") {
    return (
      <Card>
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">Confirming your payment…</h1>
        <p className="mt-2 text-navy-900/60">Please keep this page open — this only takes a moment.</p>
      </Card>
    );
  }

  if (state.status === "expired" || state.status === "error") {
    return (
      <Card>
        <h1 className="font-display text-3xl font-bold text-navy-900">
          {state.status === "expired" ? "This checkout expired" : "We couldn't confirm this payment yet"}
        </h1>
        <p className="mt-3 text-navy-900/70">
          {state.status === "expired"
            ? "No payment was taken. Please start a new booking."
            : "If you were charged, your confirmation email will arrive shortly. Otherwise please try booking again."}
        </p>
        <Link href="/book" className="mt-8 inline-block rounded-full bg-royal-700 px-8 py-3 font-semibold text-white hover:bg-navy-900">
          Back to booking
        </Link>
      </Card>
    );
  }

  const b = state.booking;

  if (state.status === "refunded") {
    return (
      <Card>
        <h1 className="font-display text-3xl font-bold text-navy-900">That slot was just taken</h1>
        <p className="mt-3 text-navy-900/70">
          Another client secured {formatSalonTime(b.appointmentAt)} on {formatSalonDate(b.appointmentAt)} moments before your
          payment completed. <strong>Your payment has been refunded in full automatically.</strong> We&apos;re sorry — please pick
          another time.
        </p>
        <Link href="/book" className="mt-8 inline-block rounded-full bg-gold-400 px-8 py-3 font-bold text-navy-950 hover:bg-gold-300">
          Choose another time
        </Link>
      </Card>
    );
  }

  const isBalance = state.kind === "BALANCE";
  return (
    <Card>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 text-navy-950 shadow-lg shadow-gold-500/40">
        <CheckIcon width={32} height={32} />
      </span>
      <h1 className="mt-6 font-display text-4xl font-bold text-navy-900">
        {isBalance ? "Balance paid — thank you!" : `You're booked, ${b.firstName}!`}
      </h1>
      <p className="mt-2 text-navy-900/60">A confirmation has been sent by email and text message.</p>

      <div className="mt-8 overflow-hidden rounded-2xl text-left ring-1 ring-navy-900/10">
        <div className="braid-texture bg-navy-900 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400">Confirmation code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-gold-300">{b.bookingCode}</p>
        </div>
        <dl className="divide-y divide-navy-900/10 bg-white px-5 text-sm">
          <Row label="Style" value={`${b.serviceName} (${formatDuration(b.durationMin)})`} />
          <Row label="Date" value={formatSalonDate(b.appointmentAt)} />
          <Row label="Time" value={formatSalonTime(b.appointmentAt)} />
          <Row label="Paid so far" value={formatUSD(b.amountPaidCents)} />
          <Row label="Balance due" value={formatUSD(b.balanceCents)} />
        </dl>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-navy-900/70">
        <PinIcon width={16} height={16} className="text-royal-700" /> {SALON.fullAddress}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {b.balanceCents > 0 && (
          <Link href={`/pay?code=${b.bookingCode}`} className="rounded-full bg-gold-400 px-6 py-3 font-bold text-navy-950 hover:bg-gold-300">
            Pay remaining {formatUSD(b.balanceCents)} now
          </Link>
        )}
        <Link href="/" className="rounded-full border-2 border-royal-700 px-6 py-3 font-semibold text-royal-700 hover:bg-royal-700 hover:text-white">
          Back to home
        </Link>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-navy-900/5 sm:p-12">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-navy-900/60">{label}</dt>
      <dd className="text-right font-semibold text-navy-900">{value}</dd>
    </div>
  );
}
