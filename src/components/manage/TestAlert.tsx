"use client";

import { useActionState } from "react";
import { testAlertAction, type ActionState } from "@/app/manage/actions";

/** "Send test email" / "Send test WhatsApp" with the exact result shown underneath. */
export function TestAlert({ channel, label }: { channel: "email" | "whatsapp"; label: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(testAlertAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="channel" value={channel} />
      <button disabled={pending} className="rounded-full bg-royal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60">
        {pending ? "Sending…" : label}
      </button>
      {state && (
        <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {state.ok ? `✓ ${state.message}` : state.error}
        </p>
      )}
    </form>
  );
}
