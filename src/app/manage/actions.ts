"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  consumeLoginToken,
  endSession,
  requestLoginLink,
  requireAdmin,
  signOutEverywhere,
  startSession,
} from "@/lib/admin-auth";
import { cancelBooking, recordPayment, rescheduleBooking, rescheduleSlots, saveNotes, setOutcome } from "@/lib/manage";

// Server actions for /manage. Next.js only accepts these from this site's own pages
// (Origin check), and every booking action re-checks the owner session.

export type ActionState = { ok?: boolean; message?: string; error?: string } | null;

export async function requestLinkAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  try {
    await requestLoginLink(email);
  } catch (err) {
    console.error("[manage] sign-in link failed", err);
  }
  // Same answer whatever the email was, so the form can't reveal the owner address.
  return { ok: true, message: "If that's the owner email, a sign-in link is on its way. It expires in 15 minutes." };
}

export async function signInAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!(await consumeLoginToken(token))) redirect("/manage?link=invalid");
  await startSession();
  redirect("/manage");
}

export async function signOutAction() {
  await endSession();
  redirect("/manage");
}

export async function signOutEverywhereAction() {
  await requireAdmin();
  await signOutEverywhere();
  await endSession();
  redirect("/manage");
}

async function done(id: string, r: { ok: true; message: string } | { ok: false; error: string }): Promise<ActionState> {
  if (r.ok) {
    revalidatePath("/manage");
    revalidatePath(`/manage/b/${id}`);
  }
  return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
}

export async function cancelAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  return done(id, await cancelBooking(id, String(form.get("reason") ?? "").slice(0, 500), form.get("refund") === "on"));
}

export async function recordPaymentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const dollars = Number(String(form.get("amount") ?? "").replace(/[^0-9.]/g, ""));
  return done(id, await recordPayment(id, Math.round(dollars * 100), String(form.get("method") ?? ""), String(form.get("note") ?? "").slice(0, 190)));
}

export async function outcomeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const v = String(form.get("outcome") ?? "");
  return done(id, await setOutcome(id, v === "COMPLETED" || v === "NO_SHOW" ? v : null));
}

export async function notesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  return done(id, await saveNotes(id, String(form.get("notes") ?? "")));
}

export async function rescheduleSlotsAction(id: string, dateKey: string) {
  await requireAdmin();
  return rescheduleSlots(id, dateKey);
}

export async function rescheduleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  return done(id, await rescheduleBooking(id, String(form.get("startsAt") ?? ""), form.get("notify") === "on"));
}
