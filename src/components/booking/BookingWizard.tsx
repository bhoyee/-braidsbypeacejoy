"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NO_ADDONS, asHairPolicy, normalizeAddOns, quoteAddOns, type AddOnSelection } from "@/lib/addons";
import { formatUsPhone, isValidUsPhone, usPhoneDigits } from "@/lib/phone";
import type { Slot } from "@/lib/availability";
import { DEPOSIT_CENTS, MAX_DAYS_AHEAD } from "@/lib/config";
import type { PublicService } from "@/lib/services";
import { addDaysToKey, formatDuration, formatSalonDate, formatSalonTime, formatUSD, salonDateKey } from "@/lib/time";
import { ArrowLeftIcon, CardIcon, CheckIcon, ClockIcon, ShieldIcon } from "../icons";
import { Calendar } from "./Calendar";
import { StyleCustomizer } from "./StyleCustomizer";
import { StylePicker } from "./StylePicker";
import { TimeSlots } from "./TimeSlots";

const STEPS = ["Style", "Date & Time", "Your Details", "Deposit"] as const;

type Props = {
  services: PublicService[];
  initialServiceSlug?: string;
  canceledSessionId?: string;
};

type Details = { clientName: string; clientEmail: string; clientPhone: string; notes: string; agree: boolean };

export function BookingWizard({ services, initialServiceSlug, canceledSessionId }: Props) {
  const preselected = services.find((s) => s.slug === initialServiceSlug);

  const [step, setStep] = useState(0);
  // Arriving from a style's "Book" button: show just that style (the full list is one tap away).
  const [showPicker, setShowPicker] = useState(!preselected);
  const router = useRouter();
  const [serviceId, setServiceId] = useState<string | null>(preselected?.id ?? null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [details, setDetails] = useState<Details>({ clientName: "", clientEmail: "", clientPhone: "", notes: "", agree: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<AddOnSelection>(NO_ADDONS);
  const customizeRef = useRef<HTMLDivElement>(null);

  const { minKey, maxKey } = useMemo(() => {
    const today = salonDateKey(new Date());
    return { minKey: today, maxKey: addDaysToKey(today, MAX_DAYS_AHEAD) };
  }, []);

  const service = services.find((s) => s.id === serviceId) ?? null;
  // The style's hair rule (e.g. "hair not provided") always applies to what's shown and sent.
  const chosenAddOns = useMemo(() => normalizeAddOns(addOns, asHairPolicy(service?.hair)), [addOns, service?.hair]);
  const quote = useMemo(() => quoteAddOns(chosenAddOns, service?.hairBundles), [chosenAddOns, service?.hairBundles]);
  const totalCents = (service?.priceCents ?? 0) + quote.totalCents;

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
    if (id !== serviceId) {
      setServiceId(id);
      setAddOns(NO_ADDONS);
      setStartsAt(null);
      setSlots(null);
    }
    // Bring the "Customize your style" panel into view.
    requestAnimationFrame(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Arriving from a style card (?service=…) — jump straight to its customize panel.
  useEffect(() => {
    if (preselected) setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [preselected]);

  const detailsValid =
    details.clientName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(details.clientEmail.trim()) &&
    isValidUsPhone(details.clientPhone) &&
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
          notes: details.notes.trim() || undefined,
          addOns: { hair: chosenAddOns.hair, bundles: quote.bundles, colorMix: chosenAddOns.colorMix },
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

      {/* STEP 1 — style (only the chosen one when arriving from a style's Book button) */}
      {step === 0 && !showPicker && service && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                // Back to the previous page; if there is none (opened in a new tab), the style menu.
                if (window.history.length > 1) router.back();
                else router.push("/styles");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy-900 ring-1 ring-navy-900/10 transition hover:bg-gold-200/60"
            >
              <ArrowLeftIcon width={16} height={16} /> Back
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-sm font-semibold text-royal-700 underline-offset-4 hover:underline"
            >
              Change style
            </button>
          </div>
          <StyleCustomizer service={service} value={chosenAddOns} quote={quote} onChange={setAddOns} onContinue={() => setStep(1)} />
        </section>
      )}

      {step === 0 && (showPicker || !service) && (
        <section>
          <h2 className="mb-6 font-display text-3xl font-bold text-navy-900">Select your style</h2>
          {services.length === 0 && <p className="text-navy-900/60">No styles are available right now — please check back soon.</p>}
          <StylePicker services={services} selectedId={serviceId} onSelect={chooseService} />
          <div ref={customizeRef} className="scroll-mt-48">
            {service && (
              <StyleCustomizer service={service} value={chosenAddOns} quote={quote} onChange={setAddOns} onContinue={() => setStep(1)} />
            )}
          </div>
        </section>
      )}

      {/* STEP 2 — date & time */}
      {step === 1 && service && (
        <section>
          <StepBack onClick={() => setStep(0)} />
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-navy-900">Pick your date &amp; time</h2>
              <p className="mt-1 text-sm text-navy-900/60">
                {service.name} · {formatDuration(service.durationMin)} — must finish by 7:00 PM
              </p>
            </div>
            <button type="button" onClick={() => setStep(0)} className="py-2 text-sm font-semibold text-royal-700 underline-offset-4 hover:underline">
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
          <StepBack onClick={() => setStep(1)} />
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
            <Field
              label="Mobile phone (US)"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(410) 555-0123"
              value={details.clientPhone}
              onChange={(v) => setDetails({ ...details, clientPhone: formatUsPhone(v) })}
              error={
                usPhoneDigits(details.clientPhone).length === 10 && !isValidUsPhone(details.clientPhone)
                  ? "That isn't a valid US number — the area code can't start with 0 or 1."
                  : undefined
              }
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-navy-900">
                Allergies or notes <span className="font-normal text-navy-900/50">(optional)</span>
              </span>
              <textarea
                rows={3}
                maxLength={500}
                value={details.notes}
                onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                placeholder="Any allergy to braiding hair or products? Colors you'd like, adding human/blended hair, or bringing your own hair?"
                className="w-full resize-y rounded-xl border border-navy-900/15 bg-cream/60 px-4 py-3 text-navy-900 outline-none transition placeholder:text-navy-900/40 focus:border-royal-700 focus:bg-white focus:ring-4 focus:ring-royal-700/10"
              />
            </label>
            <div className="rounded-xl bg-cream p-4 text-xs leading-relaxed text-navy-900/75">
              <p className="mb-1 font-semibold text-navy-900">Before your appointment</p>
              Hair washed &amp; blow-dried · no oil or product · at least 4 inches long · 2+ colors adds $20 · cancel or
              reschedule 72+ hours ahead.
            </div>
            <label className="flex gap-3 rounded-xl bg-gold-200/40 p-4 text-sm text-navy-900">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-royal-700"
                checked={details.agree}
                onChange={(e) => setDetails({ ...details, agree: e.target.checked })}
              />
              <span>
                I have read and agree to the{" "}
                <a href="/policies" target="_blank" className="font-semibold text-royal-700 underline underline-offset-2">
                  Booking Policies
                </a>{" "}
                and{" "}
                <a href="/terms" target="_blank" className="font-semibold text-royal-700 underline underline-offset-2">
                  Terms &amp; Conditions
                </a>
                , and I understand the <strong>$30.00 deposit is strictly non-refundable</strong>.
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
          <StepBack onClick={() => setStep(2)} />
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
              {details.notes.trim() && <Row label="Notes" value={details.notes.trim()} />}
              <Row label={service.name} value={formatUSD(service.priceCents)} />
              {quote.lines.map((l) => (
                <Row key={l.label} label={l.label} value={`+${formatUSD(l.cents)}`} />
              ))}
              {chosenAddOns.hair === "own" && <Row label="Hair" value="Bringing my own" />}
              <Row label="Total" value={formatUSD(totalCents)} />
              <Row label="Due today (deposit)" value={formatUSD(DEPOSIT_CENTS)} strong />
              <Row label="Balance due later" value={formatUSD(Math.max(0, totalCents - DEPOSIT_CENTS))} />
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
  inputMode?: "text" | "tel" | "email";
  maxLength?: number;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy-900">{props.label}</span>
      <input
        required
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        onChange={(e) => props.onChange(e.target.value)}
        className={`w-full rounded-xl border bg-cream/60 px-4 py-3 text-navy-900 outline-none transition focus:bg-white focus:ring-4 ${
          props.error ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : "border-navy-900/15 focus:border-royal-700 focus:ring-royal-700/10"
        }`}
      />
      {props.error && <span className="mt-1.5 block text-sm text-red-600">{props.error}</span>}
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

/** "← Back" to the previous booking step. */
function StepBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy-900 ring-1 ring-navy-900/10 transition hover:bg-gold-200/60"
    >
      <ArrowLeftIcon width={16} height={16} /> Back
    </button>
  );
}
