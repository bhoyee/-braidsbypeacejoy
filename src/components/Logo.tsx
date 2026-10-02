import Image from "next/image";
import Link from "next/link";

// Official logo (transparent PNG). logo1.jpeg is the same mark on a black square.
const LOGO_SRC = "/assets/logo2.png";

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <Link href="/" className="group inline-flex shrink-0 items-center" aria-label="Braids by Peace Joy — home">
      <Image
        src={LOGO_SRC}
        alt="Braids by Peace Joy"
        width={size}
        height={size}
        priority
        className="drop-shadow-[0_4px_18px_rgb(255_199_44/0.35)] transition-transform duration-500 group-hover:scale-105"
      />
    </Link>
  );
}
