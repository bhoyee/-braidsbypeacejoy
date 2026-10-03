import type { Metadata } from "next";
import { PayLookup } from "@/components/PayLookup";
import { PaymentBadges } from "@/components/PaymentBadges";
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
          Enter the email you booked with or your booking code. We&apos;ll show your style total minus the $30 deposit already
          paid.
        </p>
      </div>
      <div className="relative mt-12">
        <PayLookup initialQuery={code ?? ""} />
      </div>

      {/* Other ways to pay */}
      <section className="relative mx-auto mt-14 max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur sm:p-8" aria-labelledby="other-ways">
        <h2 id="other-ways" className="font-display text-2xl text-gold-300">Other ways to pay</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <a
            href={SALON.cashAppUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-[#00d632] p-5 text-white transition hover:brightness-95"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Cash App</p>
            <p className="mt-1 text-2xl font-bold">{SALON.cashApp}</p>
          </a>
          <div className="rounded-2xl bg-[#6d1ed4] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Zelle</p>
            <p className="mt-1 text-2xl font-bold">{SALON.zelle}</p>
          </div>
        </div>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-white/80">
          <li>Find your balance above (or check your confirmation email).</li>
          <li>Send it by Cash App or Zelle with your <strong className="text-gold-300">booking code</strong> in the note.</li>
          <li>
            Text a screenshot to{" "}
            <a href={SALON.smsHref} className="font-semibold text-gold-300 underline">{SALON.phone}</a> so we can mark it paid.
          </li>
        </ol>
        <p className="mt-4 text-xs text-white/50">You can also pay the balance in person at your appointment.</p>
      </section>

      <div className="relative mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3">
        <PaymentBadges className="justify-center" />
        <p className="flex items-center justify-center gap-2 text-center text-xs text-white/50">
          <ShieldIcon width={16} height={16} className="text-gold-400" />
          Card payments are processed securely by Stripe. We never see or store your card details.
        </p>
      </div>
    </div>
  );
}
