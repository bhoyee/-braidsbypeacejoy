import Link from "next/link";
import { FAQS, type Faq } from "@/content/faqs";
import { ArrowRightIcon } from "./icons";

/** One collapsible question (native <details>: works without JavaScript). */
export function FaqItem({ faq, open = false }: { faq: Faq; open?: boolean }) {
  const external = faq.link?.href.startsWith("http");
  return (
    <details
      open={open}
      className="group rounded-2xl bg-cream ring-1 ring-navy-900/10 transition open:bg-white open:shadow-lg open:ring-gold-400/60"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold text-navy-900 transition hover:text-royal-700 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <h3 className="text-base sm:text-lg">{faq.q}</h3>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal-700 text-lg leading-none text-white transition group-open:rotate-45 group-open:bg-gold-400 group-open:text-navy-950">
          +
        </span>
      </summary>
      <div className="px-5 pb-5 leading-relaxed text-navy-900/75 sm:px-6">
        <p>{faq.a}</p>
        {faq.link && (
          <Link
            href={faq.link.href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:text-navy-900"
          >
            {faq.link.label} <ArrowRightIcon width={14} height={14} />
          </Link>
        )}
      </div>
    </details>
  );
}

/** Home-page FAQ: only the questions flagged `home`, plus a link to the full FAQ. */
export function Faq() {
  const items = FAQS.filter((f) => f.home);
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
          {items.map((f) => (
            <FaqItem key={f.q} faq={f} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-full border-2 border-royal-700 px-6 py-3 font-semibold text-royal-700 transition hover:bg-royal-700 hover:text-white"
          >
            See all {FAQS.length} questions <ArrowRightIcon width={18} height={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
