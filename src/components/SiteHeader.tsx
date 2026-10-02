"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SALON } from "@/lib/config";
import { AnchorLink } from "./AnchorLink";
import { ArrowRightIcon, ClockIcon, CloseIcon, MenuIcon, PhoneIcon, PinIcon } from "./icons";
import { Logo } from "./Logo";

const NAV = [
  { href: "/styles", label: "Style Menu" },
  { href: "/#work", label: "Our Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/#visit", label: "Visit" },
  { href: "/pay", label: "Pay Balance" },
];

const SECTION_IDS = NAV.filter((n) => n.href.startsWith("/#")).map((n) => n.href.slice(2));

/** Which home-page section is currently in view (drives the active menu highlight). */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return setActive(null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      // A section counts as "current" when it crosses the middle band of the screen.
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [enabled]);
  return active;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeSection = useActiveSection(pathname === "/");
  // Only the home hero sits under a transparent nav; every other page gets a solid bar.
  const solid = pathname !== "/" || scrolled || open;

  const isActive = (href: string) => (href.startsWith("/#") ? activeSection === href.slice(2) : pathname === href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on Escape, and on any route change.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Address strip — on phones the phone number is the most useful thing, so it leads */}
      <div className="bg-navy-950 text-[12px] text-gold-200/90">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-4">
          <a href={SALON.mapsUrl} target="_blank" rel="noreferrer" className="flex h-full min-w-0 items-center gap-2 hover:text-gold-400">
            <PinIcon width={14} height={14} className="shrink-0 text-gold-400" />
            <span className="truncate sm:hidden">Suite 101 · Randallstown, MD</span>
            <span className="hidden truncate sm:inline">{SALON.fullAddress}</span>
          </a>
          <span className="flex h-full shrink-0 items-center gap-5">
            <span className="hidden items-center gap-2 md:flex">
              <ClockIcon width={14} height={14} className="text-gold-400" />
              Open daily · 8:00 AM – 7:00 PM
            </span>
            <a href={SALON.phoneHref} className="flex h-full items-center gap-2 font-semibold text-gold-300 hover:text-gold-400">
              <PhoneIcon width={14} height={14} />
              {SALON.phone}
            </a>
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav
        aria-label="Main"
        className={`transition-all duration-500 ${
          solid ? "bg-navy-900/95 shadow-2xl shadow-navy-950/40 backdrop-blur-md" : "bg-gradient-to-b from-navy-950/70 to-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-3 min-[375px]:px-4">
          <Logo size={64} responsive />
          <ul className="hidden items-center gap-8 text-sm font-medium lg:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <AnchorLink
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={`relative py-2 transition-colors hover:text-gold-400 after:absolute after:bottom-0 after:left-0 after:h-px after:bg-gold-400 after:transition-all hover:after:w-full ${
                    isActive(n.href) ? "text-gold-400 after:w-full" : "text-white/85 after:w-0"
                  }`}
                >
                  {n.label}
                </AnchorLink>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/book"
              className="hidden rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-300 sm:inline-block"
            >
              Book Now
            </Link>
            <button
              type="button"
              className={`flex h-11 w-11 items-center justify-center rounded-full transition lg:hidden ${
                open ? "bg-gold-400 text-navy-950" : "text-white hover:bg-white/10 active:bg-white/20"
              }`}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet menu */}
        <div
          id="mobile-menu"
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out lg:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0">
            <ul className="max-h-[calc(100svh-112px)] space-y-1 overflow-y-auto border-t border-gold-400/20 px-3 pb-6 pt-3">
              {NAV.map((n) => {
                const active = isActive(n.href);
                return (
                  <li key={n.href}>
                    <AnchorLink
                      href={n.href}
                      onClick={() => setOpen(false)}
                      tabIndex={open ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center justify-between rounded-xl border-l-4 px-4 py-3.5 text-base font-medium transition-all duration-200 hover:border-gold-400 hover:bg-white/10 hover:pl-5 hover:text-gold-400 focus-visible:bg-white/10 focus-visible:text-gold-400 focus-visible:outline-none active:bg-gold-400 active:text-navy-950 ${
                        active ? "border-gold-400 bg-white/10 text-gold-400" : "border-transparent text-white/90"
                      }`}
                    >
                      {n.label}
                      <ArrowRightIcon
                        width={18}
                        height={18}
                        className={`transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 ${active ? "opacity-100" : "-translate-x-2 opacity-0"}`}
                      />
                    </AnchorLink>
                  </li>
                );
              })}
              <li className="grid grid-cols-2 gap-3 pt-4">
                <a
                  href={SALON.phoneHref}
                  tabIndex={open ? 0 : -1}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-gold-400/60 px-4 py-3 font-semibold text-gold-300 transition hover:bg-gold-400/10 active:bg-gold-400 active:text-navy-950"
                >
                  <PhoneIcon width={18} height={18} /> Call
                </a>
                <Link
                  href="/book"
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="flex items-center justify-center rounded-full bg-gold-400 px-4 py-3 font-bold text-navy-950 transition hover:bg-gold-300 active:scale-[0.98]"
                >
                  Book Now
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
