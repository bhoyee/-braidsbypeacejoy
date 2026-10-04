import Image from "next/image";
import Link from "next/link";
import { categoryLabel } from "@/lib/catalog";
import type { PublicService } from "@/lib/services";
import { formatDuration, formatUSD } from "@/lib/time";
import { ArrowRightIcon, ClockIcon, CrownIcon } from "./icons";

export function ServiceCard({ service, index = 0 }: { service: PublicService; index?: number }) {
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-20px_rgb(11_26_74/0.35)] ring-1 ring-navy-900/5 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_70px_-20px_rgb(11_26_74/0.5)]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-navy-900">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="braid-texture absolute inset-0 flex items-center justify-center bg-gradient-to-br from-royal-700 via-navy-900 to-navy-950">
            <CrownIcon width={64} height={64} className="text-gold-400/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-navy-950 shadow">
          {formatUSD(service.priceCents)}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-navy-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          {categoryLabel(service.category)}
        </span>
        <h3 className="absolute inset-x-4 bottom-4 font-display text-2xl font-semibold leading-tight text-white">{service.name}</h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {service.description && <p className="text-sm leading-relaxed text-navy-900/70">{service.description}</p>}
        {service.note && (
          <p className="-mt-1 rounded-xl bg-gold-200/50 px-3 py-2 text-xs font-semibold text-navy-900 ring-1 ring-gold-400/50">💡 {service.note}</p>
        )}
        <dl className="mt-auto grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-royal-700/70">Full price</dt>
            <dd className="font-semibold text-navy-900">{formatUSD(service.priceCents)}</dd>
          </div>
          <div className="rounded-xl bg-cream px-3 py-2">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-royal-700/70">
              <ClockIcon width={12} height={12} /> Duration
            </dt>
            <dd className="font-semibold text-navy-900">{formatDuration(service.durationMin)}</dd>
          </div>
        </dl>
        <Link
          href={`/book?service=${service.slug}`}
          className="group/btn flex items-center justify-center gap-2 rounded-full bg-royal-700 px-5 py-3 font-semibold text-white transition hover:bg-gold-400 hover:text-navy-950"
        >
          Select &amp; Book Slot
          <ArrowRightIcon width={18} height={18} className="transition-transform group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
