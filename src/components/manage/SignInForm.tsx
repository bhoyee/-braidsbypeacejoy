"use client";

import { useActionState } from "react";
import { requestLinkAction, type ActionState } from "@/app/manage/actions";

export function SignInForm({ linkInvalid }: { linkInvalid: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(requestLinkAction, null);

  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-navy-900/5">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Manage Bookings</h1>
      <p className="mt-3 text-sm text-navy-900/70">
        Enter the owner email and we&apos;ll send you a one-time sign-in link. No password needed.
      </p>
      {linkInvalid && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">That sign-in link has expired or was already used. Request a new one.</p>
      )}
      {state?.ok ? (
        <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">📧 {state.message}</p>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-navy-900">Owner email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-navy-900/15 bg-cream/60 px-4 py-3 text-navy-900 outline-none focus:border-royal-700 focus:bg-white focus:ring-4 focus:ring-royal-700/10"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-royal-700 px-6 py-3 font-semibold text-white transition hover:bg-navy-900 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
