import Image from "next/image";
import Link from "next/link";
import { AnchorLink } from "@/components/AnchorLink";
import { Faq } from "@/components/Faq";
import { HeroVideo } from "@/components/HeroVideo";
import { ServiceCard } from "@/components/ServiceCard";
import { StudioTour } from "@/components/StudioTour";
import {
  ArrowRightIcon,
  ClockIcon,
  CrownIcon,
  InstagramIcon,
  PhoneIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
} from "@/components/icons";
import { SALON } from "@/lib/config";
import { ABOUT_PEACE_JOY, PREP_CHECKLIST } from "@/lib/policies";
import { buildHomeJsonLd } from "@/lib/seo";
import { getServices } from "@/lib/services";

// Style menu is regenerated at most every 5 minutes (ISR) — edge-fast on Vercel.
export const revalidate = 300;

const PILLARS = [
  {
    icon: SparkleIcon,
    title: "Tension-Free Artistry",
    body: "Knotless, feather-light installs engineered to protect your edges and scalp — flawless parts, every time.",
  },
  {
    icon: CrownIcon,
    title: "Private Luxury Suite",
    body: "A calm, one-on-one experience inside PHENIX Salon Suite 101. No crowded floor, no rushing.",
  },
  {
    icon: ShieldIcon,
    title: "Guaranteed Time Slot",
    body: "Your $30 deposit locks your exact date and time instantly. Nobody else can book over you.",
  },
];

const GALLERY = [
  { src: "/assets/pix3.jpeg", alt: "Long honey-blonde knotless braids", caption: "Knotless Braids", pos: "object-center" },
  { src: "/assets/pix1.jpeg", alt: "Fulani-inspired braids with curly ends", caption: "Fulani Braids · Curly Ends", pos: "object-[50%_30%]" },
  { src: "/assets/pix4-cropped.jpg", alt: "Two clients showing long braids inside the studio", caption: "Signature Long Braids", pos: "object-[50%_60%]" },
];

export default async function HomePage() {
  const services = await getServices();
  // "<" is escaped so user-editable text (style descriptions) can never break out of the script tag.
  const jsonLd = JSON.stringify(buildHomeJsonLd(services)).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-navy-950">
        {/* Navy backdrop (desktop text side) */}
        <div className="braid-texture absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_20%_30%,var(--color-royal-700),var(--color-navy-950)_65%)]" />
        <HeroVideo />

        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-36 text-center [text-shadow:0_2px_24px_rgb(0_0_0/0.55)] lg:text-left">
          <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-[52%]">
          <p className="animate-fade-up flex items-center justify-center gap-4 lg:justify-start">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400 sm:w-16 lg:hidden" />
            <span className="font-display text-2xl font-semibold italic text-gold-300 sm:text-4xl">Braids by Peace Joy</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-400 sm:w-16" />
          </p>
          <h1 className="animate-fade-up mt-5 font-display text-5xl font-bold leading-[1.05] text-white [animation-delay:120ms] sm:text-7xl">
            Crowned in <span className="text-gradient-gold italic">Artistry.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/90 [animation-delay:240ms] lg:mx-0">
            Knotless braids, boho styles, cornrows &amp; twists for adults and kids — sculpted by hand in a private suite in
            Randallstown, Maryland.
          </p>

          <div className="animate-fade-up mt-12 flex flex-col items-center gap-6 [animation-delay:360ms] lg:items-start">
            <Link
              href="/book"
              className="animate-glow group relative inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-gold-400 px-6 py-4 text-base font-bold sm:px-9 sm:py-5 text-navy-950 [text-shadow:none] transition hover:scale-[1.03] hover:bg-gold-300 sm:text-xl"
            >
              Book Your Luxury Transformation
              <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-white/90">
              <AnchorLink href="/#styles" className="py-3 underline-offset-8 hover:text-gold-300 hover:underline">
                Explore the style menu
              </AnchorLink>
              <span className="h-4 w-px bg-white/30" />
              <a href={SALON.phoneHref} className="flex items-center gap-2 py-3 hover:text-gold-300">
                <PhoneIcon width={16} height={16} className="text-gold-400" /> {SALON.phone}
              </a>
            </div>
          </div>
          </div>
        </div>

        {/* Info chips */}
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-white/10 bg-navy-950/60 backdrop-blur-md md:block">
          <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-white/10 text-sm text-white/80">
            <p className="flex items-center justify-center gap-3 py-5"><ClockIcon className="text-gold-400" /> Open 7 days · 8 AM – 7 PM</p>
            <p className="flex items-center justify-center gap-3 py-5"><ShieldIcon className="text-gold-400" /> $30 deposit locks your slot</p>
            <p className="flex items-center justify-center gap-3 py-5"><PinIcon className="text-gold-400" /> PHENIX Salon Suite 101</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── STYLE MENU ───────────────────────── */}
      <section id="styles" className="scroll-mt-28 bg-cream py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-royal-700">The Style Menu</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-navy-900 sm:text-5xl">Choose Your Crown</h2>
            <div className="gold-rule mx-auto mt-6 w-40" />
            <p className="mt-6 text-navy-900/70">
              Transparent pricing — the full price and appointment time for every style, upfront. Choose yours and book in minutes.
            </p>
          </div>

          {services.length ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white p-10 text-center text-navy-900/70 shadow">
              Our style menu is being refreshed. Please check back shortly or{" "}
              <Link href="/book" className="font-semibold text-royal-700 underline">open the booking page</Link>.
            </p>
          )}
        </div>
      </section>

      {/* ───────────────────────── OUR WORK ───────────────────────── */}
      <section id="work" className="scroll-mt-28 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-royal-700">Our Work</p>
              <h2 className="mt-3 font-display text-4xl font-bold text-navy-900 sm:text-5xl">Fresh From the Chair</h2>
            </div>
            <a
              href={SALON.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-royal-700 px-5 py-2.5 text-sm font-semibold text-royal-700 transition hover:bg-royal-700 hover:text-white"
            >
              <InstagramIcon width={18} height={18} /> More on Instagram
            </a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY.map((g, i) => (
              <figure
                key={g.src}
                className={`group relative aspect-[3/4] overflow-hidden rounded-3xl bg-navy-900 ${i === 0 ? "lg:row-span-2 lg:aspect-auto" : ""}`}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className={`object-cover ${g.pos} transition duration-700 group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3">
                  <span className="font-display text-xl text-white">{g.caption}</span>
                  <span className="h-2 w-2 rounded-full bg-gold-400" />
                </figcaption>
              </figure>
            ))}
            {/* CTA tile */}
            <div className="braid-texture flex aspect-[3/4] flex-col justify-between rounded-3xl bg-royal-700 p-8 text-white lg:row-span-2 lg:aspect-auto">
              <CrownIcon width={40} height={40} className="text-gold-400" />
              <div>
                <p className="font-display text-3xl font-semibold leading-tight">
                  Your crown <span className="text-gold-300 italic">is next.</span>
                </p>
                <p className="mt-3 text-sm text-white/75">Pick a style, choose your time, and lock it in with a $30 deposit.</p>
                <Link
                  href="/book"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-bold text-navy-950 transition hover:bg-gold-300"
                >
                  Book Now <ArrowRightIcon width={18} height={18} />
                </Link>
              </div>
            </div>
            <figure className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-navy-900 sm:col-span-2 sm:aspect-[2/1]">
              <Image
                src="/assets/pix6.jpeg"
                alt="Styling chairs inside the Braids by Peace Joy suite"
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                className="object-cover object-[50%_40%] transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-5 bottom-5 font-display text-xl text-white">Your chair is ready</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ───────────────────────── MEET YOUR BRAIDER ───────────────────────── */}
      <section id="about" className="scroll-mt-28 overflow-hidden bg-cream py-20 sm:py-24" aria-labelledby="about-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 -rotate-3 rounded-[2.25rem] bg-gold-400/80" aria-hidden="true" />
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-4 border-white shadow-2xl">
              <Image
                src="/assets/hero-poster.jpg"
                alt="A happy client showing off her fresh braids in the Braids by Peace Joy suite"
                fill
                sizes="(min-width:1024px) 380px, 90vw"
                className="object-cover"
              />
            </div>
            <p className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 rounded-full bg-navy-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 shadow-xl">
              Love in every braid
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-royal-700">Meet your braider</p>
            <h2 id="about-heading" className="mt-3 font-display text-4xl font-bold text-navy-900 sm:text-5xl">
              Hey love, I&apos;m <span className="italic text-royal-700">Peace Joy.</span>
            </h2>
            <div className="gold-rule mt-6 w-40" />
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-navy-900/80">
              {ABOUT_PEACE_JOY.slice(0, 2).map((para) => (
                <p key={para}>{para.replace(/^Hey love, I'm Peace Joy\. /, "")}</p>
              ))}
            </div>
            <p className="mt-8 font-display text-2xl italic text-royal-700">{ABOUT_PEACE_JOY[2]}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-gold-600">— Peace Joy</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── EXPERIENCE ───────────────────────── */}
      <section id="experience" className="braid-texture relative scroll-mt-28 overflow-hidden bg-navy-900 py-24 text-white">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-royal-600/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">The Experience</p>
            <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
              Luxury isn&apos;t a style. <span className="text-gradient-gold">It&apos;s a standard.</span>
            </h2>
            <div className="mt-10 space-y-4">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-gold-400/50 hover:bg-white/10">
                  <span className="h-fit rounded-2xl bg-gold-400 p-3 text-navy-950"><Icon width={22} height={22} /></span>
                  <div>
                    <h3 className="font-display text-xl">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-gold-400 shadow-2xl">
              <Image src="/assets/pix5.jpeg" alt="The Braidsbypeacejoy studio" fill sizes="(min-width:1024px) 450px, 100vw" className="object-cover object-[50%_35%]" />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-2xl bg-gold-400 px-6 py-4 text-navy-950 shadow-xl">
              <p className="font-display text-2xl font-bold">Suite 101</p>
              <p className="text-xs font-semibold uppercase tracking-widest">PHENIX Salon Suites</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── BEFORE YOUR APPOINTMENT ───────────────────────── */}
      <section id="before" className="scroll-mt-28 bg-gold-400 py-20 text-navy-950 sm:py-24" aria-labelledby="before-heading">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-navy-900/70">Read before booking</p>
              <h2 id="before-heading" className="mt-3 font-display text-4xl font-bold sm:text-5xl">Before Your Appointment</h2>
              <p className="mt-4 text-navy-900/80">Kindly read through these instructions before booking to ensure a happy experience.</p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-3 font-semibold text-gold-300 transition hover:bg-navy-950"
            >
              Read all booking policies <ArrowRightIcon width={18} height={18} />
            </Link>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREP_CHECKLIST.map((item, i) => (
              <li key={item.title} className="flex gap-4 rounded-2xl bg-white/85 p-5 shadow-sm ring-1 ring-navy-900/5 transition hover:bg-white hover:shadow-lg">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-gold-300">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-900/75">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-navy-900 p-6 text-white lg:col-span-2">
              <h3 className="font-display text-xl text-gold-300">$30 deposit secures your slot</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Pay online by card, Apple Pay or Link when you book — your time is locked instantly. Prefer{" "}
                <strong className="text-gold-300">Cash App {SALON.cashApp}</strong> or{" "}
                <strong className="text-gold-300">Zelle {SALON.zelle}</strong>? Text us to book that way. Deposits are non-refundable;
                no call / no show cancels the appointment and forfeits the deposit. Cancel or reschedule at least 72 hours ahead.
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 p-6">
              <h3 className="font-display text-xl">Pricing &amp; hair</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-900/80">
                Prices include braiding hair (except passion twists &amp; crochet). 2+ colors adds $20. Upgrade to 100% human hair ($80 per
                bundle) or blended hair ($50 per bundle) when you book, or bring your own.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Faq />

      {/* ───────────────────────── VISIT ───────────────────────── */}
      <section id="visit" className="scroll-mt-28 bg-cream py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-royal-700">Visit Us</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-navy-900 sm:text-5xl">Your Private Suite Awaits</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <a href={SALON.mapsUrl} target="_blank" rel="noreferrer" className="flex gap-3 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-navy-900/5 hover:ring-gold-400">
                <PinIcon className="mt-0.5 shrink-0 text-royal-700" />
                <span>
                  <strong className="block text-navy-900">{SALON.addressLine}</strong>
                  {SALON.suite}
                </span>
              </a>
              <div className="flex gap-3 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-navy-900/5">
                <ClockIcon className="mt-0.5 shrink-0 text-royal-700" />
                <span>
                  <strong className="block text-navy-900">Mon – Sun</strong>
                  8:00 AM – 7:00 PM
                </span>
              </div>
              <a href={SALON.phoneHref} className="flex gap-3 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-navy-900/5 hover:ring-gold-400">
                <PhoneIcon className="mt-0.5 shrink-0 text-royal-700" />
                <span>
                  <strong className="block text-navy-900">Call or text</strong>
                  {SALON.phone}
                </span>
              </a>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <figure className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl ring-4 ring-gold-400/60 sm:aspect-auto">
                <Image src="/assets/pix2.jpeg" alt="The Braids by Peace Joy storefront window" fill sizes="(min-width:640px) 35vw, 100vw" className="object-cover object-[50%_30%]" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 to-transparent p-5 pt-16 text-sm text-white">
                  <strong className="block font-display text-lg text-gold-300">Look for our window</strong>
                  Suite 101 at 8700 Liberty Rd
                </figcaption>
              </figure>
              <div className="overflow-hidden rounded-3xl shadow-xl ring-4 ring-gold-400/60">
                <iframe
                  title={`Map to ${SALON.name}`}
                  src="https://www.google.com/maps?q=8700+Liberty+Rd,+Randallstown,+MD+21133&output=embed"
                  className="h-full min-h-[380px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          <div className="lg:pt-16">
            <StudioTour />
          </div>
        </div>
      </section>
    </>
  );
}
