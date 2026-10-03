import type { Booking } from "@prisma/client";
import { formatUSD } from "@/lib/time";

const pill = "inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide";

/** Status chips for a booking (payment + what happened). */
export function StatusBadges({ b }: { b: Pick<Booking, "paymentStatus" | "outcome" | "totalCents" | "amountPaidCents" | "depositRefunded"> }) {
  const balance = b.totalCents - b.amountPaidCents;
  return (
    <span className="flex flex-wrap gap-1.5">
      {b.paymentStatus === "CANCELLED" && (
        <span className={`${pill} bg-red-100 text-red-700`}>Cancelled{b.depositRefunded ? " · refunded" : ""}</span>
      )}
      {b.paymentStatus === "REFUNDED" && <span className={`${pill} bg-red-100 text-red-700`}>Auto-refunded</span>}
      {b.outcome === "NO_SHOW" && <span className={`${pill} bg-orange-100 text-orange-700`}>No-show</span>}
      {b.outcome === "COMPLETED" && <span className={`${pill} bg-green-100 text-green-700`}>Completed</span>}
      {(b.paymentStatus === "DEPOSIT_PAID" || b.paymentStatus === "FULLY_SETTLED") &&
        (balance > 0 ? (
          <span className={`${pill} bg-gold-200 text-navy-900`}>Owes {formatUSD(balance)}</span>
        ) : (
          <span className={`${pill} bg-royal-700/10 text-royal-700`}>Paid in full</span>
        ))}
    </span>
  );
}
