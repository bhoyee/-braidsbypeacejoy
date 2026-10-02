// Accepted payment methods. Lightweight text badges in each brand's colours
// (not the official logo artwork) — swap in official SVGs if preferred.
const BADGES: { label: string; className: string; title: string }[] = [
  { label: "VISA", title: "Visa", className: "bg-white text-[#1a1f71] italic font-black tracking-tight" },
  { label: "Mastercard", title: "Mastercard", className: "bg-white text-[#eb001b] font-bold" },
  { label: "AMEX", title: "American Express", className: "bg-[#2e77bc] text-white font-black" },
  { label: "DISCOVER", title: "Discover", className: "bg-white text-[#e65c00] font-bold" },
  { label: " Pay", title: "Apple Pay", className: "bg-black text-white font-semibold" },
  { label: "link", title: "Link by Stripe", className: "bg-[#00d66f] text-[#011e0f] font-bold" },
  { label: "$ Cash App", title: "Cash App", className: "bg-[#00d632] text-white font-bold" },
  { label: "Zelle", title: "Zelle", className: "bg-[#6d1ed4] text-white font-bold" },
];

export function PaymentBadges({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Accepted payment methods">
      {BADGES.map((b) => (
        <li
          key={b.title}
          title={b.title}
          className={`flex h-8 min-w-[3.25rem] items-center justify-center rounded-md px-2.5 text-[11px] leading-none shadow-sm ring-1 ring-black/10 ${b.className}`}
        >
          {b.title === "Apple Pay" ? (
            <>
              <svg viewBox="0 0 384 512" className="mr-0.5 h-3 w-3 fill-current" aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              <span>Pay</span>
            </>
          ) : (
            <span>{b.label}</span>
          )}
          <span className="sr-only">{b.title}</span>
        </li>
      ))}
    </ul>
  );
}
