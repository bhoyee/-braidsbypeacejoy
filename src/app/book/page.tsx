import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PolicyBanner } from "@/components/PolicyBanner";
import { getServices } from "@/lib/services";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose your style, pick an open time between 8 AM and 7 PM, and secure your slot with a $30 deposit.",
};

type SearchParams = Promise<{ service?: string; canceled?: string; session_id?: string }>;

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, services] = await Promise.all([searchParams, getServices()]);

  return (
    <div className="min-h-screen bg-cream pt-[112px]">
      <PolicyBanner />
      <section className="braid-texture bg-navy-900 px-4 pb-16 pt-12 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">Reserve your chair</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Book Your Luxury Transformation</h1>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Live availability · Open daily 8:00 AM – 7:00 PM · Your slot is locked the moment your deposit clears.
        </p>
      </section>
      <div className="-mt-6 pt-0">
        <div className="mx-auto max-w-6xl rounded-t-3xl bg-cream px-0 pt-10">
          <BookingWizard
            services={services}
            initialServiceSlug={sp.service}
            canceledSessionId={sp.canceled && sp.session_id ? sp.session_id : undefined}
          />
        </div>
      </div>
    </div>
  );
}
