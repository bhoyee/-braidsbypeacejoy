"use client";

import { COLOR_MIX_CENTS, HAIR_OPTIONS, MAX_BUNDLES, asHairPolicy, clampBundles, hairOptionsFor, type AddOnQuote, type AddOnSelection } from "@/lib/addons";
import type { PublicService } from "@/lib/services";
import { formatDuration, formatUSD } from "@/lib/time";
import { ArrowRightIcon, CheckIcon } from "../icons";

type Props = {
  service: PublicService;
  value: AddOnSelection;
  quote: AddOnQuote;
  onChange: (v: AddOnSelection) => void;
  onContinue: () => void;
};

/** "Customize your style": hair upgrade (per bundle) + color mix, with a live total. */
export function StyleCustomizer({ service, value, quote, onChange, onContinue }: Props) {
  const selectedHair = HAIR_OPTIONS.find((o) => o.id === value.hair) ?? HAIR_OPTIONS[0];
  const paidHair = selectedHair.perBundleCents > 0;
  const total = service.priceCents + quote.totalCents;
  const policy = asHairPolicy(service.hair);
  const hairOptions = hairOptionsFor(policy);

  return (
    <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-2 ring-gold-400" id="customize">
      <div className="braid-texture flex flex-wrap items-center justify-between gap-3 bg-navy-900 px-6 py-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Customize your style</p>
          <p className="mt-1 font-display text-2xl">{service.name}</p>
        </div>
        <p className="text-sm text-white/70">
          {formatUSD(service.priceCents)} · {formatDuration(service.durationMin)}
        </p>
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-7">
          {service.note && (
            <p className="flex gap-2 rounded-2xl bg-gold-200/50 p-4 text-sm font-medium text-navy-900 ring-1 ring-gold-400/60">
              <span aria-hidden="true">💡</span>
              {service.note}
            </p>
          )}

          {policy === "none" && (
            <p className="rounded-2xl bg-cream p-4 text-sm text-navy-900/70">No add-ons needed for this service — just choose your date and time.</p>
          )}

          {/* Hair */}
          {policy !== "none" && (
          <fieldset>
            <legend className="mb-3 font-semibold text-navy-900">Hair</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {hairOptions.map((o) => {
                const active = o.id === value.hair;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                      active ? "border-gold-400 bg-gold-200/30" : "border-navy-900/10 hover:border-royal-700/40 hover:bg-cream"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hair"
                      value={o.id}
                      checked={active}
                      onChange={() => onChange({ ...value, hair: o.id })}
                      className="mt-1 h-4 w-4 accent-royal-700"
                    />
                    <span>
                      <span className="block font-semibold text-navy-900">{o.label}</span>
                      <span className="block text-sm text-navy-900/60">{o.note}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {paidHair && (
              <div className="mt-4 rounded-2xl bg-cream p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">How many bundles?</p>
                    <p className="text-xs text-navy-900/60">Starts at 1 — tap + to add more. Not sure? We&apos;ll confirm at your appointment.</p>
                  </div>
                  <div className="flex items-center gap-2" role="group" aria-label="Number of bundles">
                    <StepButton
                      label="Fewer bundles"
                      disabled={quote.bundles <= 1}
                      onClick={() => onChange({ ...value, bundles: clampBundles(quote.bundles - 1) })}
                    >
                      −
                    </StepButton>
                    <span className="w-10 text-center text-lg font-bold text-navy-900" aria-live="polite">
                      {quote.bundles}
                    </span>
                    <StepButton
                      label="More bundles"
                      disabled={quote.bundles >= MAX_BUNDLES}
                      onClick={() => onChange({ ...value, bundles: clampBundles(quote.bundles + 1) })}
                    >
                      +
                    </StepButton>
                  </div>
                </div>
              </div>
            )}
          </fieldset>
          )}

          {/* Color */}
          {policy !== "none" && (
          <fieldset>
            <legend className="mb-3 font-semibold text-navy-900">Color</legend>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition ${
                value.colorMix ? "border-gold-400 bg-gold-200/30" : "border-navy-900/10 hover:border-royal-700/40 hover:bg-cream"
              }`}
            >
              <input
                type="checkbox"
                checked={value.colorMix}
                onChange={(e) => onChange({ ...value, colorMix: e.target.checked })}
                className="h-5 w-5 accent-royal-700"
              />
              <span className="flex-1">
                <span className="block font-semibold text-navy-900">Mix of 2 or more colors</span>
                <span className="block text-sm text-navy-900/60">Adds {formatUSD(COLOR_MIX_CENTS)}</span>
              </span>
            </label>
          </fieldset>
          )}
        </div>

        {/* Live summary */}
        <aside className="h-fit rounded-2xl bg-cream p-5 lg:sticky lg:top-48">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-royal-700">Your price</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy-900/70">{service.name}</dt>
              <dd className="font-semibold text-navy-900">{formatUSD(service.priceCents)}</dd>
            </div>
            {quote.lines.map((l) => (
              <div key={l.label} className="flex justify-between gap-3">
                <dt className="text-navy-900/70">{l.label}</dt>
                <dd className="font-semibold text-navy-900">+{formatUSD(l.cents)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-navy-900/10 pt-3 text-base">
              <dt className="font-bold text-navy-900">Total</dt>
              <dd className="font-bold text-royal-700">{formatUSD(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 flex gap-2 text-xs text-navy-900/60">
            <CheckIcon width={14} height={14} className="mt-0.5 shrink-0 text-royal-700" />
            Only the $30 deposit is paid today. The rest is due at your appointment or online.
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-royal-700 px-6 py-3 font-semibold text-white transition hover:bg-navy-900"
          >
            Choose date &amp; time <ArrowRightIcon width={18} height={18} />
          </button>
        </aside>
      </div>
    </div>
  );
}

function StepButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-700 text-xl font-bold text-white transition hover:bg-navy-900 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
