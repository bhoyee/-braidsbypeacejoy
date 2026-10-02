import Link from "next/link";

const PAGES = [
  { href: "/policies", label: "Booking Policies" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

/** Shared layout for the policies / terms / privacy pages. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  current,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  updated: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream pt-[112px]">
      <section className="braid-texture bg-navy-900 px-4 pb-14 pt-12 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        <div className="mx-auto mt-4 max-w-2xl text-white/75">{intro}</div>
        <p className="mt-4 text-xs text-white/50">Last updated {updated}</p>
      </section>

      <nav aria-label="Policies" className="sticky top-[112px] z-30 border-b border-navy-900/10 bg-white/95 backdrop-blur">
        <ul className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 py-2 text-sm">
          {PAGES.map((p) => (
            <li key={p.href} className="shrink-0">
              <Link
                href={p.href}
                aria-current={p.href === current ? "page" : undefined}
                className={`block rounded-full px-4 py-2 font-semibold transition ${
                  p.href === current ? "bg-royal-700 text-white" : "text-navy-900/70 hover:bg-cream hover:text-royal-700"
                }`}
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">{children}</div>
    </div>
  );
}

/** Numbered section card used inside legal pages. */
export function LegalSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-48 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy-900/5 sm:p-8">
      <h2 className="font-display text-2xl font-semibold text-navy-900">{title}</h2>
      <div className="mt-4 space-y-3 leading-relaxed text-navy-900/80 [&_a]:font-semibold [&_a]:text-royal-700 [&_a]:underline [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
