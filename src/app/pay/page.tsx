import type { Metadata } from "next";
import { PayLookup } from "@/components/PayLookup";
import { ShieldIcon } from "@/components/icons";
import { SALON } from "@/lib/config";

const PAY_DESCRIPTION =
  "Pay the remaining balance for your Braids by Peace Joy appointment securely online — just enter the email you booked with or your booking code.";

export const metadata: Metadata = {
  title: "Pay Your Balance Online",
  description: PAY_DESCRIPTION,
  alternates: { canonical: "/pay" },
  openGraph: { url: "/pay", title: "Pay Your Balance | Braids by Peace Joy", description: PAY_DESCRIPTION },
  twitter: { title: "Pay Your Balance | Braids by Peace Joy", description: PAY_DESCRIPTION },
};

export default async function PayPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  return (
    <div className="braid-texture relative min-h-screen overflow-hidden bg-navy-900 px-4 pb-24 pt-[160px]">
      <div className="pointer-events-none absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-royal-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[24rem] w-[24rem] rounded-full bg-gold-500/15 blur-3xl" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">Balance Settlement</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
          Clear your balance <span className="text-gradient-gold italic">in seconds.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Enter the email or phone number you booked with, or your booking code. We&apos;ll show your style total minus what
          you&apos;ve already paid.
        </p>
      </div>

      <div className="relative mx-auto mt-12 grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main: look up and pay by card */}
        <div>
          <PayLookup initialQuery={code ?? ""} />
          <p className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-center text-xs text-white/50">
            <ShieldIcon width={16} height={16} className="shrink-0 text-gold-400" />
            Card payments are processed securely by Stripe. We never see or store your card details.
          </p>
        </div>

        {/* Side: other ways to pay */}
        <aside
          className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur lg:sticky lg:top-36"
          aria-labelledby="other-ways"
        >
          <h2 id="other-ways" className="font-display text-2xl text-gold-300">Other ways to pay</h2>
          <div className="mt-5 space-y-3">
            <a href={SALON.cashAppUrl} target="_blank" rel="noreferrer" className="block rounded-2xl bg-[#00d632] p-4 text-white transition hover:brightness-95">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Cash App</p>
              <p className="mt-0.5 text-xl font-bold">{SALON.cashApp}</p>
            </a>
            <div className="rounded-2xl bg-[#6d1ed4] p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Zelle</p>
              <p className="mt-0.5 text-xl font-bold">{SALON.zelle}</p>
            </div>
          </div>
          <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-white/80">
            <li>Find your balance (or check your confirmation email).</li>
            <li>Send it with your <strong className="text-gold-300">booking code</strong> in the note.</li>
            <li>
              Text a screenshot to{" "}
              <a href={SALON.smsHref} className="font-semibold text-gold-300 underline">{SALON.phone}</a> so we can mark it paid.
            </li>
          </ol>
          <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/50">You can also pay in person at your appointment.</p>
        </aside>
      </div>
    </div>
  );
}
