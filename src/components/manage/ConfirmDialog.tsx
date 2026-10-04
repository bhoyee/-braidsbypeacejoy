"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Tone = "primary" | "danger" | "warning";
export type ConfirmOptions = { title: string; message: ReactNode; confirmLabel: string; tone?: Tone };

const TONE: Record<Tone, string> = {
  primary: "bg-royal-700 hover:bg-navy-900 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-orange-500 hover:bg-orange-600 text-white",
};

/**
 * Branded "Are you sure?" pop-up for owner actions.
 * Use `guard(e, options)` in a form's onSubmit: it pauses the submit, asks, and on
 * "yes" submits again with the same button (so button values like NO_SHOW are kept).
 * Pass `null` as options to let the submit through without asking.
 */
export function useConfirm() {
  const [req, setReq] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const approved = useRef(false);

  const guard = (e: FormEvent<HTMLFormElement>, options: ConfirmOptions | null) => {
    if (approved.current) {
      approved.current = false;
      return;
    }
    if (!options) return;
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    new Promise<boolean>((resolve) => setReq({ ...options, resolve })).then((ok) => {
      if (!ok) return;
      approved.current = true;
      form.requestSubmit(submitter ?? undefined);
    });
  };

  const dialog = req ? (
    <ConfirmDialog
      {...req}
      onClose={(ok) => {
        req.resolve(ok);
        setReq(null);
      }}
    />
  ) : null;

  return { guard, dialog };
}

function ConfirmDialog({ title, message, confirmLabel, tone = "primary", onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button type="button" aria-label="Close" onClick={() => onClose(false)} className="absolute inset-0 cursor-default bg-navy-950/60 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md animate-[pop_160ms_ease-out] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-navy-900/10"
      >
        <div className="h-1.5 bg-gold-400" />
        <div className="p-6">
          <h2 id="confirm-title" className="font-display text-2xl font-bold text-navy-900">
            {title}
          </h2>
          <div className="mt-2 text-sm leading-relaxed text-navy-900/75">{message}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-full px-5 py-3 text-sm font-semibold text-navy-900 ring-1 ring-navy-900/15 transition hover:bg-cream"
            >
              Go back
            </button>
            <button ref={confirmBtn} type="button" onClick={() => onClose(true)} className={`rounded-full px-6 py-3 text-sm font-semibold shadow-sm transition ${TONE[tone]}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
