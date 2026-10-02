import Image from "next/image";
import Link from "next/link";

// Official logo (transparent PNG). logo1.jpeg is the same mark on a black square.
const LOGO_SRC = "/assets/logo2.png";

/** Logo mark + "Braids by Peace Joy" wordmark (the mark alone is hard to read at header size). */
export function Logo({ size = 56, showName = true, responsive = false }: { size?: number; showName?: boolean; responsive?: boolean }) {
  return (
    <Link href="/" className="group inline-flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3" aria-label="Braids by Peace Joy — home">
      <Image
        src={LOGO_SRC}
        alt=""
        width={size}
        height={size}
        priority
        // In the header the mark scales down on very small phones so the menu button always fits.
        className={`drop-shadow-[0_4px_18px_rgb(255_199_44/0.35)] transition-transform duration-500 group-hover:scale-105 ${
          responsive ? "h-12 w-12 min-[375px]:h-14 min-[375px]:w-14 sm:h-16 sm:w-16" : ""
        }`}
      />
      {showName && (
        <span className="min-w-0 leading-none">
          <span className="block whitespace-nowrap font-display text-lg font-bold tracking-wide text-white min-[375px]:text-[1.35rem] sm:text-2xl">
            Braids <span className="text-sm font-semibold italic text-gold-400 sm:text-base">by</span> Peace Joy
          </span>
          <span className="mt-1.5 hidden text-[9px] font-semibold uppercase tracking-[0.38em] text-gold-300/85 min-[375px]:block sm:text-[10px]">
            Luxury Braiding Studio
          </span>
        </span>
      )}
    </Link>
  );
}
