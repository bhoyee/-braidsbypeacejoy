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
import { sendEmail, sendWhatsAppAlert } from "@/lib/notifications";
import { adminEmails } from "@/lib/secrets";

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

/** Alerts check: send a test to the owner's email or WhatsApp and report the exact result. */
export async function testAlertAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const channel = String(form.get("channel"));
  const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  try {
    if (channel === "email") {
      const to = adminEmails().join(", ");
      if (!to) return { ok: false, error: "ADMIN_EMAIL is not set in the server .env." };
      const r = await sendEmail(to, "✅ Test alert — Braids by Peace Joy", `<p>Email alerts are working (${stamp}).</p>`, `Email alerts are working (${stamp}).`);
      if (r === "skipped") return { ok: false, error: "Email isn't set up: SMTP_HOST is missing from the server .env." };
      return { ok: true, message: `Test email sent to ${to}. If it doesn't arrive in a minute, check Spam/Junk.` };
    }
    const r = await sendWhatsAppAlert(`✅ Test alert — Braids by Peace Joy\nWhatsApp booking alerts are working (${stamp}).`);
    if (r === "skipped") return { ok: false, error: "WhatsApp isn't set up: WHATSAPP_ALERT_NUMBER or CALLMEBOT_API_KEY is missing from the server .env." };
    const reply = r === "sent" ? "" : ` ${r.slice(6)}.`;
    return { ok: true, message: `CallMeBot accepted the message.${reply} It usually arrives within a minute — CallMeBot gives no delivery receipt, so if it never arrives the problem is on their side.` };
  } catch (err) {
    const msg = (err as Error).message;
    const hint = /535|auth/i.test(msg)
      ? ` — the mail server rejected the login. Check SMTP_USER is the full mailbox address (e.g. bookings@braidsbypeacejoy.com) and SMTP_PASS is that mailbox's current password (cPanel → Email Accounts → Manage → Password).`
      : "";
    return { ok: false, error: `Failed: ${msg}${hint}` };
  }
}
