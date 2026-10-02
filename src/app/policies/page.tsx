import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SALON } from "@/lib/config";
import { BOOKING_POLICIES } from "@/lib/policies";

const DESCRIPTION =
  "Braids by Peace Joy booking policies: $30 deposit (card, Apple Pay, Cash App or Zelle), 72-hour cancellation, pricing, hair preparation, hair add-ons and allergies.";

export const metadata: Metadata = {
  title: "Booking Policies",
  description: DESCRIPTION,
  alternates: { canonical: "/policies" },
  openGraph: { url: "/policies", title: "Booking Policies | Braids by Peace Joy", description: DESCRIPTION },
};

export default function PoliciesPage() {
  return (
    <LegalPage
      eyebrow="Read before booking"
      title="Booking Policies"
      intro="Kindly read through these policies carefully before booking to ensure a happy experience."
      updated="October 2026"
      current="/policies"
    >
      {/* Quick jump links */}
      <div className="mb-8 flex flex-wrap gap-2">
        {BOOKING_POLICIES.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-royal-700 ring-1 ring-royal-700/20 transition hover:bg-royal-700 hover:text-white"
          >
            {p.title}
          </a>
        ))}
      </div>

      <div className="space-y-5">
        {BOOKING_POLICIES.map((p) => (
          <LegalSection key={p.id} id={p.id} title={p.title}>
            <ul>
              {p.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </LegalSection>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl bg-navy-900 p-8 text-center text-white">
        <p className="font-display text-2xl">Ready to book your style?</p>
        <p className="max-w-lg text-sm text-white/70">
          Questions about a policy? Call or text <a href={SALON.phoneHref} className="font-semibold text-gold-300 underline">{SALON.phone}</a>.
        </p>
        <Link href="/book" className="rounded-full bg-gold-400 px-8 py-3 font-bold text-navy-950 transition hover:bg-gold-300">
          Book Now
        </Link>
      </div>
    </LegalPage>
  );
}
