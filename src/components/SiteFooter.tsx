import Link from "next/link";
import { SALON } from "@/lib/config";
import { ClockIcon, InstagramIcon, PhoneIcon, PinIcon, ShieldIcon, TikTokIcon, YouTubeIcon } from "./icons";
import { Logo } from "./Logo";

const SOCIALS = [
  { href: SALON.socials.instagram, label: "Instagram", icon: InstagramIcon },
  { href: SALON.socials.tiktok, label: "TikTok", icon: TikTokIcon },
  { href: SALON.socials.youtube, label: "YouTube", icon: YouTubeIcon },
];

export function SiteFooter() {
  return (
    <footer className="braid-texture relative bg-navy-950 text-white/75">
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-3">
        <div className="space-y-5">
          <Logo size={128} />
          <p className="max-w-xs text-sm leading-relaxed">
            Your beauty satisfaction is our priority. Precision braiding, locs and protective styling for adults &amp; kids —
            crafted in a private suite in Randallstown, Maryland.
          </p>
          <div className="flex gap-3">
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="rounded-full border border-gold-400/40 p-2.5 text-gold-300 transition hover:bg-gold-400 hover:text-navy-950"
              >
                <Icon width={18} height={18} />
              </a>
            ))}
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <h3 className="font-display text-lg text-gold-400">Visit the Suite</h3>
          <a href={SALON.mapsUrl} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-gold-300">
            <PinIcon className="mt-0.5 shrink-0 text-gold-400" />
            <span>
              {SALON.addressLine}
              <br />
              {SALON.suite}
            </span>
          </a>
          <p className="flex gap-3">
            <ClockIcon className="mt-0.5 shrink-0 text-gold-400" />
            <span>Monday – Sunday<br />8:00 AM – 7:00 PM</span>
          </p>
          <a href={SALON.phoneHref} className="flex gap-3 font-semibold text-gold-300 hover:text-gold-400">
            <PhoneIcon className="mt-0.5 shrink-0 text-gold-400" />
            {SALON.phone}
          </a>
        </div>
        <div className="space-y-4 text-sm">
          <h3 className="font-display text-lg text-gold-400">Appointments</h3>
          <p className="flex gap-3">
            <ShieldIcon className="mt-0.5 shrink-0 text-gold-400" />
            <span>A strict, non-refundable $30.00 deposit secures every appointment.</span>
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/book" className="rounded-full bg-gold-400 px-5 py-2 font-semibold text-navy-950 hover:bg-gold-300">Book Now</Link>
            <Link href="/pay" className="rounded-full border border-gold-400/60 px-5 py-2 font-semibold text-gold-300 hover:bg-gold-400/10">Pay Balance</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {SALON.name} · {SALON.fullAddress} · {SALON.phone}
      </div>
    </footer>
  );
}
