import { signInAction } from "../actions";

export const dynamic = "force-dynamic";

// The emailed link lands here. Signing in needs a button press (POST) on purpose:
// email scanners that pre-open links would otherwise use up the one-time link.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <div className="flex min-h-[calc(100svh-212px)] items-center justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-navy-900/5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Sign in to Manage Bookings</h1>
        <p className="mt-3 text-sm text-navy-900/70">You&apos;ll stay signed in on this device for 30 days.</p>
        <form action={signInAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="w-full rounded-full bg-gold-400 px-6 py-4 text-lg font-bold text-navy-950 transition hover:bg-gold-300">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
