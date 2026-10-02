import type { Metadata } from "next";
import Link from "next/link";
import { FaqBrowser } from "@/components/FaqBrowser";
import { SALON } from "@/lib/config";
import { buildFaqJsonLd } from "@/lib/seo";

const DESCRIPTION =
  "Answers about booking, the $30 deposit, payments, preparing your hair, styles and hair, and our Randallstown, MD location and hours.";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { url: "/faq", title: "FAQ | Braids by Peace Joy", description: DESCRIPTION },
};

export default function FaqPage() {
  const jsonLd = JSON.stringify(buildFaqJsonLd()).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen bg-cream pt-[112px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="braid-texture bg-navy-900 px-4 pb-14 pt-12 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">Good to know</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Frequently Asked Questions</h1>
        <p className="mx-auto mt-4 max-w-xl text-white/70">Pick a topic or search. Can&apos;t find your answer? Call or text us.</p>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <FaqBrowser />

        <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl bg-navy-900 p-8 text-center text-white">
          <p className="font-display text-2xl">Still have a question?</p>
          <p className="text-sm text-white/70">
            Call or text <a href={SALON.phoneHref} className="font-semibold text-gold-300 underline">{SALON.phone}</a>, or read our{" "}
            <Link href="/policies" className="font-semibold text-gold-300 underline">booking policies</Link>.
          </p>
          <Link href="/book" className="rounded-full bg-gold-400 px-8 py-3 font-bold text-navy-950 transition hover:bg-gold-300">
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
