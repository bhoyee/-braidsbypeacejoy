import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutStatus } from "@/components/CheckoutStatus";

export const metadata: Metadata = { title: "Payment Received", robots: { index: false } };

export default async function PaySuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/pay");

  return (
    <div className="braid-texture min-h-screen bg-navy-900 px-4 pb-24 pt-[140px]">
      <CheckoutStatus sessionId={session_id} />
    </div>
  );
}
