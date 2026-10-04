"use client";

import { useEffect, useRef, useState } from "react";

type NetInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Vertical studio-tour video: plays by itself, silent and on a loop.
 * Kept light for slow connections:
 * - nothing downloads until the video is close to the screen;
 * - it pauses when scrolled away;
 * - on data-saver, 2G/3G or "reduce motion", only the still poster shows.
 * The file itself is a small, silent 1.4 MB loop (public/assets/studio-tour-loop.mp4).
 */
export function StudioTour() {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const net = (navigator as Navigator & { connection?: NetInfo }).connection;
    const slow = net?.saveData || /(^|-)2g|3g/.test(net?.effectiveType ?? "");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (slow || calm || !box.current) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          video.current?.play().catch(() => {});
        } else {
          video.current?.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className="relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[2rem] border-4 border-gold-400 bg-navy-950 shadow-[0_40px_80px_-30px_rgb(4_11_38/0.8)]"
    >
      <video
        ref={video}
        className="h-full w-full object-cover"
        src={load ? "/assets/studio-tour-loop.mp4" : undefined}
        poster="/assets/studio-tour-poster.jpg"
        preload="none"
        muted
        loop
        playsInline
        autoPlay={load}
        aria-label="A short silent tour of the Braids by Peace Joy studio, Suite 101"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent px-6 pb-8 pt-20 text-center text-white">
        <p className="font-display text-xl">Take the studio tour</p>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold-300">Suite 101 · PHENIX Salon Suites</p>
      </div>
    </div>
  );
}
