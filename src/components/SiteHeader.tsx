"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SALON } from "@/lib/config";
import { ClockIcon, CloseIcon, MenuIcon, PhoneIcon, PinIcon } from "./icons";
import { Logo } from "./Logo";

const NAV = [
  { href: "/#styles", label: "Style Menu" },
  { href: "/#work", label: "Our Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/#visit", label: "Visit" },
  { href: "/pay", label: "Pay Balance" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Only the home hero sits under a transparent nav; every other page gets a solid bar.
  const solid = usePathname() !== "/" || scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Address strip */}
      <div className="bg-navy-950 text-[12px] text-gold-200/90">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-6 px-4 sm:justify-between">
          <a href={SALON.mapsUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:text-gold-400">
            <PinIcon width={14} height={14} className="shrink-0 text-gold-400" />
            <span className="truncate">{SALON.fullAddress}</span>
          </a>
          <span className="hidden items-center gap-5 sm:flex">
            <span className="hidden items-center gap-2 md:flex">
              <ClockIcon width={14} height={14} className="text-gold-400" />
              Open daily · 8:00 AM – 7:00 PM
            </span>
            <a href={SALON.phoneHref} className="flex items-center gap-2 font-semibold text-gold-300 hover:text-gold-400">
              <PhoneIcon width={14} height={14} />
              {SALON.phone}
            </a>
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav
        className={`transition-all duration-500 ${
          solid ? "bg-navy-900/95 shadow-2xl shadow-navy-950/40 backdrop-blur-md" : "bg-gradient-to-b from-navy-950/70 to-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <Logo size={68} />
          <ul className="hidden items-center gap-8 text-sm font-medium text-white/85 lg:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="relative transition-colors hover:text-gold-400 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gold-400 after:transition-all hover:after:w-full">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="hidden rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-300 sm:inline-block"
            >
              Book Now
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-white lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <ul className="space-y-1 border-t border-white/10 px-4 pb-6 pt-3 lg:hidden">
            {[...NAV, { href: "/book", label: "Book Now" }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-white/90 hover:bg-white/5 hover:text-gold-400">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}
