"use client";

import { useEffect, useMemo, useState } from "react";
import type { Slot } from "@/lib/availability";
import { DEPOSIT_CENTS, MAX_DAYS_AHEAD } from "@/lib/config";
import type { PublicService } from "@/lib/services";
import { addDaysToKey, formatDuration, formatSalonDate, formatSalonTime, formatUSD, salonDateKey } from "@/lib/time";
import { CardIcon, CheckIcon, ClockIcon, ShieldIcon } from "../icons";
import { Calendar } from "./Calendar";
import { TimeSlots } from "./TimeSlots";

const STEPS = ["Style", "Date & Time", "Your Details", "Deposit"] as const;

type Props = {
  services: PublicService[];
  initialServiceSlug?: string;
  canceledSessionId?: string;
};

type Details = { clientName: string; clientEmail: string; clientPhone: string; agree: boolean };

export function BookingWizard({ services, initialServiceSlug, canceledSessionId }: Props) {
  const preselected = services.find((s) => s.slug === initialServiceSlug);

  const [step, setStep] = useState(preselected ? 1 : 0);
  const [serviceId, setServiceId] = useState<string | null>(preselected?.id ?? null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [details, setDetails] = useState<Details>({ clientName: "", clientEmail: "", clientPhone: "", agree: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { minKey, maxKey } = useMemo(() => {
    const today = salonDateKey(new Date());
    return { minKey: today, maxKey: addDaysToKey(today, MAX_DAYS_AHEAD) };
  }, []);

  const service = services.find((s) => s.id === serviceId) ?? null;

  // Returning from a cancelled Stripe Checkout → release the held slot immediately.
  useEffect(() => {
    if (!canceledSessionId) return;
    setNotice("Checkout was cancelled — no payment was taken and your held slot has been released.");
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: canceledSessionId }),
    }).catch(() => undefined);
    window.history.replaceState(null, "", window.location.pathname + (initialServiceSlug ? `?service=${initialServiceSlug}` : ""));
  }, [canceledSessionId, initialServiceSlug]);

  // Live availability: re-fetched whenever the style or date changes.
  useEffect(() => {
    if (!serviceId || !dateKey) return;
    const ctrl = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);
    fetch(`/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${dateKey}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load times.");
        setSlots(data.slots as Slot[]);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setSlotsError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSlotsLoading(false);
      });
    return () => ctrl.abort();
  }, [serviceId, dateKey, refresh]);

  // A previously selected slot that became unavailable is dropped.
  useEffect(() => {
    if (startsAt && slots && !slots.some((s) => s.startsAt === startsAt && s.status === "available")) setStartsAt(null);
  }, [slots, startsAt]);

  const chooseService = (id: string) => {
    setServiceId(id);
    setStartsAt(null);
    setSlots(null);
    setStep(1);
  };

  const detailsValid =
    details.clientName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(details.clientEmail.trim()) &&
    details.clientPhone.replace(/\D/g, "").length >= 10 &&
    details.agree;

  async function pay() {
    if (!service || !startsAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          appointmentAt: startsAt,
          clientName: details.clientName.trim(),
          clientEmail: details.clientEmail.trim(),
          clientPhone: details.clientPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || res.status === 422) {
          setStartsAt(null);
          setRefresh((n) => n + 1);
          setStep(1);
        }
        throw new Error(data.error ?? "Something went wrong.");
      }
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const endTime = service && startsAt ? new Date(new Date(startsAt).getTime() + service.durationMin * 60_000) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {notice && <p className="mb-6 rounded-2xl bg-royal-700 px-5 py-4 text-sm text-white">{notice}</p>}

      {/* Stepper */}
      <ol className="mb-10 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!done}
                onClick={() => setStep(i)}
                className="flex w-full flex-col items-center gap-2 text-center disabled:cursor-default"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    active
                      ? "bg-gold-400 text-navy-950 shadow-lg shadow-gold-500/40"
                      : done
                        ? "bg-royal-700 text-white"
                        : "bg-navy-900/10 text-navy-900/40"
                  }`}
                >
                  {done ? <CheckIcon width={18} height={18} /> : i + 1}
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-wider sm:text-xs ${active ? "text-navy-900" : "text-navy-900/50"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* STEP 1 — style */}
      {step === 0 && (
        <section>
          <h2 className="mb-6 font-display text-3xl font-bold text-navy-900">Select your style</h2>
          {services.length === 0 && <p className="text-navy-900/60">No styles are available right now — please check back soon.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => chooseService(s.id)}
                className={`group rounded-2xl bg-white p-5 text-left ring-2 transition hover:-translate-y-0.5 hover:shadow-xl ${
                  s.id === serviceId ? "ring-gold-400" : "ring-transparent hover:ring-royal-700/30"
                }`}
              >
                <p className="font-display text-xl font-semibold text-navy-900">{s.name}</p>
                <p className="mt-2 flex items-center gap-3 text-sm text-navy-900/60">
                  <span className="font-bold text-royal-700">{formatUSD(s.priceCents)}</span>
                  <span className="flex items-center gap-1"><ClockIcon width={14} height={14} /> {formatDuration(s.durationMin)}</span>
                </p>
                <span className="mt-4 inline-block rounded-full bg-royal-700 px-4 py-2 text-xs font-semibold text-white group-hover:bg-gold-400 group-hover:text-navy-950">
                  Select &amp; Book Slot
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 2 — date & time */}
      {step === 1 && service && (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-navy-900">Pick your date &amp; time</h2>
              <p className="mt-1 text-sm text-navy-900/60">
                {service.name} · {formatDuration(service.durationMin)} — must finish by 7:00 PM
              </p>
            </div>
            <button type="button" onClick={() => setStep(0)} className="text-sm font-semibold text-royal-700 underline-offset-4 hover:underline">
              Change style
            </button>
          </div>
          {error && <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
            <Calendar
              value={dateKey}
              minKey={minKey}
              maxKey={maxKey}
              onChange={(k) => {
                setDateKey(k);
                setStartsAt(null);
                setError(null);
              }}
            />
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-navy-900/10">
              <p className="mb-4 font-display text-lg font-semibold text-navy-900">
                {dateKey ? formatSalonDate(`${dateKey}T12:00:00Z`) : "Available times"}
              </p>
              <TimeSlots slots={dateKey ? slots : null} loading={slotsLoading} error={slotsError} value={startsAt} onChange={setStartsAt} />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!startsAt}
              onClick={() => setStep(2)}
              className="rounded-full bg-royal-700 px-8 py-3 font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 — details */}
      {step === 2 && (
        <section className="mx-auto max-w-xl">
          <h2 className="mb-6 font-display text-3xl font-bold text-navy-900">Your details</h2>
          <form
            className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy-900/10"
            onSubmit={(e) => {
              e.preventDefault();
              if (detailsValid) setStep(3);
            }}
          >
            <Field label="Full name" autoComplete="name" value={details.clientName} onChange={(v) => setDetails({ ...details, clientName: v })} />
            <Field label="Email" type="email" autoComplete="email" value={details.clientEmail} onChange={(v) => setDetails({ ...details, clientEmail: v })} />
            <Field label="Mobile phone" type="tel" autoComplete="tel" placeholder="(410) 555-0123" value={details.clientPhone} onChange={(v) => setDetails({ ...details, clientPhone: v })} />
            <label className="flex gap-3 rounded-xl bg-gold-200/40 p-4 text-sm text-navy-900">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-royal-700"
                checked={details.agree}
                onChange={(e) => setDetails({ ...details, agree: e.target.checked })}
              />
              <span>
                I understand the <strong>$30.00 deposit is strictly non-refundable</strong> and is required to secure and block my
                appointment slot.
              </span>
            </label>
            <button
              type="submit"
              disabled={!detailsValid}
              className="w-full rounded-full bg-royal-700 px-8 py-3 font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review booking
            </button>
          </form>
        </section>
      )}

      {/* STEP 4 — review & deposit */}
      {step === 3 && service && startsAt && endTime && (
        <section className="mx-auto max-w-xl">
          <h2 className="mb-6 font-display text-3xl font-bold text-navy-900">Review &amp; secure your slot</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-navy-900/10">
            <div className="braid-texture bg-navy-900 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-gold-400">Your appointment</p>
              <p className="mt-2 font-display text-2xl font-semibold">{service.name}</p>
              <p className="mt-1 text-white/80">{formatSalonDate(startsAt)}</p>
              <p className="text-white/80">
                {formatSalonTime(startsAt)} – {formatSalonTime(endTime)}
              </p>
            </div>
            <dl className="divide-y divide-navy-900/10 px-6 text-sm">
              <Row label="Client" value={`${details.clientName} · ${details.clientPhone}`} />
              <Row label="Style total" value={formatUSD(service.priceCents)} />
              <Row label="Due today (deposit)" value={formatUSD(DEPOSIT_CENTS)} strong />
              <Row label="Balance due later" value={formatUSD(Math.max(0, service.priceCents - DEPOSIT_CENTS))} />
            </dl>
            <div className="space-y-4 bg-cream p-6">
              <p className="flex gap-2 text-xs text-navy-900/70">
                <ShieldIcon width={16} height={16} className="shrink-0 text-royal-700" />
                Your slot is held for 30 minutes while you pay and is locked the instant Stripe confirms your $30 deposit.
              </p>
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
              <button
                type="button"
                onClick={pay}
                disabled={submitting}
                className="animate-glow flex w-full items-center justify-center gap-3 rounded-full bg-gold-400 px-8 py-4 text-lg font-bold text-navy-950 transition hover:bg-gold-300 disabled:animate-none disabled:opacity-60"
              >
                <CardIcon />
                {submitting ? "Redirecting to secure checkout…" : "Pay $30 Deposit & Lock My Slot"}
              </button>
              <p className="text-center text-xs text-navy-900/50">Card · Apple Pay · Link — secured by Stripe</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy-900">{props.label}</span>
      <input
        required
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl border border-navy-900/15 bg-cream/60 px-4 py-3 text-navy-900 outline-none transition focus:border-royal-700 focus:bg-white focus:ring-4 focus:ring-royal-700/10"
      />
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-navy-900/60">{label}</dt>
      <dd className={strong ? "text-lg font-bold text-royal-700" : "font-semibold text-navy-900"}>{value}</dd>
    </div>
  );
}
