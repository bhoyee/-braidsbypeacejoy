import { DEPOSIT_POLICY } from "@/lib/config";

/** Omnipresent deposit policy — sticks to the top of the booking wizard. */
export function PolicyBanner() {
  return (
    <div
      role="alert"
      className="sticky top-[112px] z-40 border-y-2 border-gold-600 bg-gold-400 px-4 py-3 text-center text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/20 sm:text-base"
    >
      {DEPOSIT_POLICY}
    </div>
  );
}
