import type { Booking } from "@prisma/client";
import { formatUSD, ordinal } from "@/lib/time";

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
      {b.outcome === "NOT_UPDATED" && (
        <span className={`${pill} bg-slate-200 text-slate-700`} title="Never marked and the balance wasn't recorded — set Completed or No-show">
          Not updated
        </span>
      )}
      {(b.paymentStatus === "DEPOSIT_PAID" || b.paymentStatus === "FULLY_SETTLED") &&
        (balance > 0 ? (
          <span className={`${pill} bg-gold-200 text-navy-900`}>Owes {formatUSD(balance)}</span>
        ) : (
          <span className={`${pill} bg-green-600 text-white`}>✓ Paid in full</span>
        ))}
    </span>
  );
}

/** "New client" or "Returning · 3rd visit" — clients are matched by email. */
export function ClientBadge({ visit }: { visit: number }) {
  if (visit <= 1) return <span className={`${pill} shrink-0 font-sans bg-sky-100 text-sky-800`}>New client</span>;
  return <span className={`${pill} shrink-0 font-sans bg-purple-100 text-purple-800`}>★ Returning · {ordinal(visit)} visit</span>;
}
