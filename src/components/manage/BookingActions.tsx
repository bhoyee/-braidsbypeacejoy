"use client";

import { useActionState } from "react";
import { cancelAction, notesAction, outcomeAction, recordPaymentAction, type ActionState } from "@/app/manage/actions";

const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5";
const input =
  "w-full rounded-xl border border-navy-900/15 bg-cream/60 px-4 py-2.5 text-navy-900 outline-none focus:border-royal-700 focus:bg-white focus:ring-4 focus:ring-royal-700/10";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
      {state.ok ? `✓ ${state.message}` : state.error}
    </p>
  );
}

export function RecordPaymentForm({ id, balance }: { id: string; balance: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordPaymentAction, null);
  return (
    <section className={card}>
      <h2 className="font-display text-xl text-navy-900">Record a payment</h2>
      <p className="mt-1 text-sm text-navy-900/60">For Cash App, Zelle or cash. The client gets an email receipt.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <input type="hidden" name="id" value={id} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy-900">Amount ($)</span>
          <input name="amount" inputMode="decimal" defaultValue={(balance / 100).toFixed(2)} required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy-900">Paid by</span>
          <select name="method" required defaultValue="" className={input}>
            <option value="" disabled>Choose…</option>
            <option value="CASHAPP">Cash App</option>
            <option value="ZELLE">Zelle</option>
            <option value="CASH">Cash</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-navy-900">Note (optional)</span>
          <input name="note" maxLength={190} placeholder="e.g. Cash App ref or screenshot received" className={input} />
        </label>
        <button disabled={pending} className="rounded-full bg-royal-700 px-6 py-3 font-semibold text-white hover:bg-navy-900 disabled:opacity-60 sm:col-span-2">
          {pending ? "Saving…" : "Record payment"}
        </button>
      </form>
      <Feedback state={state} />
    </section>
  );
}

export function OutcomeButtons({ id, started, current }: { id: string; started: boolean; current: "COMPLETED" | "NO_SHOW" | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(outcomeAction, null);
  return (
    <section className={card}>
      <h2 className="font-display text-xl text-navy-900">After the appointment</h2>
      <p className="mt-1 text-sm text-navy-900/60">
        {started ? "Did the client come? You can change this later." : "These unlock when the appointment starts."}
      </p>
      <form action={action} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <button name="outcome" value="COMPLETED" disabled={!started || pending || current === "COMPLETED"} className="rounded-full bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40">
          ✓ Completed
        </button>
        <button
          name="outcome"
          value="NO_SHOW"
          disabled={!started || pending || current === "NO_SHOW"}
          onClick={(e) => {
            if (!confirm("Mark as no-show? The deposit is kept (no refund for no-shows).")) e.preventDefault();
          }}
          className="rounded-full bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          No-show
        </button>
        {current && (
          <button name="outcome" value="" disabled={pending} className="rounded-full px-4 py-2.5 text-sm font-semibold text-navy-900/60 hover:text-navy-900">
            Undo
          </button>
        )}
      </form>
      <Feedback state={state} />
    </section>
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(notesAction, null);
  return (
    <section className={card}>
      <h2 className="font-display text-xl text-navy-900">Private notes</h2>
      <p className="mt-1 text-sm text-navy-900/60">Only you can see these.</p>
      <form action={action} className="mt-3">
        <input type="hidden" name="id" value={id} />
        <textarea name="notes" rows={3} maxLength={2000} defaultValue={notes} placeholder="e.g. prefers medium parts, tender-headed" className={input} />
        <button disabled={pending} className="mt-2 rounded-full border-2 border-royal-700 px-5 py-2 text-sm font-semibold text-royal-700 hover:bg-royal-700 hover:text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save notes"}
        </button>
      </form>
      <Feedback state={state} />
    </section>
  );
}

export function CancelForm({ id, canRefund }: { id: string; canRefund: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelAction, null);
  if (state?.ok) return <Feedback state={state} />;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
      <h2 className="font-display text-xl text-red-700">Cancel this booking</h2>
      <p className="mt-1 text-sm text-navy-900/60">Frees the time slot and emails the client.</p>
      <form
        action={action}
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          const refund = (e.currentTarget.elements.namedItem("refund") as HTMLInputElement | null)?.checked;
          if (!confirm(`Cancel this booking${refund ? " and REFUND the deposit" : " (deposit kept)"}? The client will be emailed.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy-900">Reason (shown to the client, optional)</span>
          <input name="reason" maxLength={500} placeholder="e.g. Stylist unavailable — please rebook" className={input} />
        </label>
        {canRefund ? (
          <label className="flex items-start gap-3 rounded-xl bg-cream p-3 text-sm text-navy-900">
            <input type="checkbox" name="refund" className="mt-0.5 h-4 w-4 accent-royal-700" />
            <span>
              <strong>Refund the deposit</strong> to the client&apos;s card (exceptions only — your policy is non-refundable).
            </span>
          </label>
        ) : (
          <p className="text-xs text-navy-900/50">The deposit wasn&apos;t paid online, so it can&apos;t be refunded from here.</p>
        )}
        <button disabled={pending} className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {pending ? "Cancelling…" : "Cancel booking"}
        </button>
      </form>
      <Feedback state={state} />
    </section>
  );
}

/** Compact Completed / No-show buttons for the booking list. */
export function QuickOutcome({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(outcomeAction, null);
  if (state?.ok) return null; // the list refreshes with the new badge
  return (
    <form action={action} className="flex gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button name="outcome" value="COMPLETED" disabled={pending} className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
        ✓ Completed
      </button>
      <button
        name="outcome"
        value="NO_SHOW"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Mark as no-show? The deposit is kept (no refund for no-shows).")) e.preventDefault();
        }}
        className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        No-show
      </button>
      {state && !state.ok && <span className="self-center text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
