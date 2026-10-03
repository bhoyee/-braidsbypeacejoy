import type { Metadata } from "next";

// Private owner area: never indexed, never cached (see next.config.mjs).
export const metadata: Metadata = {
  title: "Manage Bookings",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream pb-20 pt-[112px]">{children}</div>;
}
