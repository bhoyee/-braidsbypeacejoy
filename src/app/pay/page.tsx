import type { Metadata } from "next";
import { PayLookup } from "@/components/PayLookup";
import { ShieldIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Pay Your Balance",
  description: "Look up your appointment by email or booking code and settle your remaining balance securely online.",
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
      <p className="relative mx-auto mt-12 flex max-w-md items-center justify-center gap-2 text-center text-xs text-white/50">
        <ShieldIcon width={16} height={16} className="text-gold-400" />
        Payments are processed securely by Stripe. We never see or store your card details.
      </p>
    </div>
  );
}
