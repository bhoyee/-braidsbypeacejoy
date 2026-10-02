import { FAQS } from "@/lib/seo";

/** Visible FAQ — the same Q&As are published as FAQPage structured data and in /llms.txt. */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 bg-white py-20 sm:py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-royal-700">Good to know</p>
          <h2 id="faq-heading" className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <div className="gold-rule mx-auto mt-6 w-40" />
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              open={i === 0}
              className="group rounded-2xl bg-cream ring-1 ring-navy-900/10 transition open:bg-white open:shadow-lg open:ring-gold-400/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold text-navy-900 transition hover:text-royal-700 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base sm:text-lg">{f.q}</h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal-700 text-lg leading-none text-white transition group-open:rotate-45 group-open:bg-gold-400 group-open:text-navy-950">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-navy-900/75 sm:px-6">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
