import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isUnsubscribed, setUnsubscribed, verifyUnsubscribeToken } from "@/lib/clients";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };

type SP = Promise<{ e?: string; t?: string; done?: string }>;

async function update(form: FormData) {
  "use server";
  const e = String(form.get("e") ?? "");
  const t = String(form.get("t") ?? "");
  if (!verifyUnsubscribeToken(e, t)) redirect("/unsubscribe");
  const on = form.get("action") === "resubscribe";
  await setUnsubscribed(e, !on);
  redirect(`/unsubscribe?e=${encodeURIComponent(e)}&t=${t}&done=${on ? "resubscribed" : "unsubscribed"}`);
}

export default async function UnsubscribePage({ searchParams }: { searchParams: SP }) {
  const { e = "", t = "", done } = await searchParams;
  const valid = Boolean(e && t && verifyUnsubscribeToken(e, t));
  const off = valid && (await isUnsubscribed(e));

  return (
    <div className="min-h-screen bg-cream px-4 pb-20 pt-[152px]">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-navy-900/5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Email preferences</p>
        {!valid ? (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">This link isn&apos;t valid</h1>
            <p className="mt-3 text-sm text-navy-900/70">Please use the unsubscribe link from one of our emails, or reply to the email and we&apos;ll take care of it.</p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">
              {done === "unsubscribed" ? "You're unsubscribed" : done === "resubscribed" ? "You're back on the list 💛" : off ? "You're unsubscribed" : "Unsubscribe?"}
            </h1>
            <p className="mt-3 text-sm text-navy-900/70">
              {off
                ? <>We won&apos;t send review requests or reminders to book again to <strong>{e}</strong>. You&apos;ll still get confirmations and reminders for appointments you book.</>
                : <>Stop review requests and reminders to book again to <strong>{e}</strong>? You&apos;ll still get confirmations and reminders for appointments you book.</>}
            </p>
            <form action={update} className="mt-6">
              <input type="hidden" name="e" value={e} />
              <input type="hidden" name="t" value={t} />
              {off ? (
                <button name="action" value="resubscribe" className="rounded-full border-2 border-royal-700 px-6 py-2.5 font-semibold text-royal-700 hover:bg-royal-700 hover:text-white">
                  Changed your mind? Resubscribe
                </button>
              ) : (
                <button name="action" value="unsubscribe" className="rounded-full bg-royal-700 px-6 py-3 font-semibold text-white hover:bg-navy-900">
                  Unsubscribe
                </button>
              )}
            </form>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-royal-700 hover:underline">
          ← Back to the website
        </Link>
      </div>
    </div>
  );
}
