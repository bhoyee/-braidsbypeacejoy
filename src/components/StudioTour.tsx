"use client";

import { useRef, useState } from "react";
import { PlayIcon } from "./icons";

/** Vertical studio-tour video: poster first, plays with sound on tap (nothing downloads until then). */
export function StudioTour() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[2rem] border-4 border-gold-400 bg-navy-950 shadow-[0_40px_80px_-30px_rgb(4_11_38/0.8)]">
      <video
        ref={ref}
        className="h-full w-full object-cover"
        src="/assets/studio-tour.mp4"
        poster="/assets/studio-tour-poster.jpg"
        preload="none"
        playsInline
        controls={playing}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {!playing && (
        <button
          type="button"
          onClick={() => ref.current?.play()}
          className="group absolute inset-0 flex flex-col items-center justify-end gap-4 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent pb-10 text-white"
          aria-label="Play the studio tour"
        >
          <span className="animate-glow flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 text-navy-950 transition group-hover:scale-110">
            <PlayIcon width={26} height={26} />
          </span>
          <span className="font-display text-xl">Take the studio tour</span>
          <span className="text-xs uppercase tracking-[0.3em] text-gold-300">Suite 101 · 30 sec</span>
        </button>
      )}
    </div>
  );
}
