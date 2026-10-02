"use client";

import { useEffect, useState } from "react";

const SRC = "/assets/hero-video.mp4";
const POSTER = "/assets/hero-poster.jpg";

function Clip() {
  return (
    <video
      className="hero-video h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={POSTER}
      aria-hidden="true"
    >
      <source src={SRC} type="video/mp4" />
    </video>
  );
}

/**
 * Hero video. The clip is vertical (≈478px wide), so:
 * - phones/tablets: full-bleed background behind the centred text;
 * - desktop: a full-height panel on the right. At that height it is shown at
 *   close to its native width, so it stays sharp instead of being stretched.
 * Only one <video> is mounted at a time.
 */
export function HeroVideo() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!wide) {
    return (
      <div className="absolute inset-0 -z-10 lg:hidden" aria-hidden="true">
        <Clip />
        {/* Blue tint so the centred text stays readable */}
        <div className="absolute inset-0 bg-navy-950/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-transparent to-navy-950/90" />
      </div>
    );
  }

  return (
    <div className="absolute inset-y-0 right-0 -z-10 hidden aspect-[9/16] h-full max-w-[46vw] lg:block" aria-hidden="true">
      <Clip />
      {/* Soft fade into the navy on the left edge, gold hairline, and top/bottom fades */}
      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-navy-950 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gold-400/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-navy-950/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-navy-950 to-transparent" />
      <p className="absolute bottom-24 right-6 rounded-full border border-gold-400/50 bg-navy-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">
        Real client · Real transformation
      </p>
    </div>
  );
}
