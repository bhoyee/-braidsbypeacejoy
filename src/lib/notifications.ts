import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Booking, Service } from "@prisma/client";
import { addOnsSummary } from "./addons";
import { SALON } from "./config";
import { formatDuration, formatSalonDate, formatSalonTime, formatUSD } from "./time";

type BookingWithService = Booking & { service: Service };

/* ------------------------------------------------------------------ */
/* Transports — each is optional; missing credentials = log and skip.  */
/* ------------------------------------------------------------------ */

let mailer: Transporter | null = null;
function getMailer(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  mailer ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. mail.braidsbypeacejoy.com (cPanel)
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return mailer;
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const t = getMailer();
  if (!t) return console.info(`[email:skipped] ${to} — ${subject}`);
  await t.sendMail({
    from: process.env.EMAIL_FROM ?? `"${SALON.name}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}

/** Twilio Programmable SMS over plain REST (no SDK needed on shared hosting). */
export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return console.info(`[sms:skipped] ${to} — ${body}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: toE164(to), From: from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

/** Sends every message, logging failures instead of throwing on the first one. */
async function dispatch(jobs: Promise<unknown>[]) {
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("[notify] delivery failed", r.reason);
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function details(b: BookingWithService) {
  const balance = Math.max(0, b.totalCents - b.amountPaidCents);
  return {
    date: formatSalonDate(b.appointmentAt),
    time: formatSalonTime(b.appointmentAt),
    service: b.service.name,
    duration: formatDuration(b.service.durationMin),
    paid: formatUSD(b.amountPaidCents),
    balance: formatUSD(balance),
    hasBalance: balance > 0,
    addOns: addOnsSummary(b),
    payUrl: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/pay?code=${b.bookingCode}`,
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailShell(title: string, rows: [string, string][], footer: string) {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">${esc(k)}</td><td style="padding:8px 0;font-weight:600;color:#0b1a4a;text-align:right">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#0b1a4a;padding:28px 32px;color:#ffc72c;font-size:22px;font-weight:700;letter-spacing:1px">${SALON.name}</td></tr>
      <tr><td style="padding:28px 32px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#0b1a4a">${title}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb">${tr}</table>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#374151">${footer}</p>
      </td></tr>
      <tr><td style="background:#ffc72c;padding:16px 32px;font-size:13px;color:#0b1a4a">📍 ${SALON.fullAddress}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Instant alert to client + admin after a verified Stripe payment. */
export async function notifyBookingConfirmed(b: BookingWithService, kind: "DEPOSIT" | "BALANCE", chargedCents: number) {
  const d = details(b);
  const isDeposit = kind === "DEPOSIT";
  const rows: [string, string][] = [
    ["Confirmation code", b.bookingCode],
    ["Service", `${d.service} (${d.duration})`],
    ...(d.addOns ? ([["Add-ons", `${d.addOns} (+${formatUSD(b.addOnsCents)})`]] as [string, string][]) : []),
    ["Total", formatUSD(b.totalCents)],
    ["Date", d.date],
    ["Time", d.time],
    ["Paid today", formatUSD(chargedCents)],
    ["Balance due", d.balance],
  ];

  const clientSubject = isDeposit
    ? `Your appointment is confirmed — ${d.date} at ${d.time}`
    : `Payment received — you're fully settled for ${d.date}`;
  const clientFooter = isDeposit
    ? `Your $30 deposit is non-refundable and has locked in your slot. ${
        d.hasBalance ? `Pay the remaining ${d.balance} anytime at <a href="${d.payUrl}">${d.payUrl}</a> or at your appointment.` : ""
      }<br/><br/><strong>Before your appointment:</strong> please arrive with your hair washed and blow-dried, with no oil or product. Running late? Call or text ${SALON.phone}. To cancel or reschedule, reply to this email or text us at least 72 hours before — later cancellations need a new deposit to rebook.`
    : "Thank you! Your balance is cleared. We can't wait to see you.";

  const clientSms = isDeposit
    ? `${SALON.name}: Confirmed! ${d.service} on ${d.date} at ${d.time}. Code ${b.bookingCode}. Balance ${d.balance}. ${SALON.fullAddress}`
    : `${SALON.name}: Payment of ${formatUSD(chargedCents)} received for ${d.date} at ${d.time}. Balance ${d.balance}. Code ${b.bookingCode}.`;

  const adminSubject = `💰 ${isDeposit ? "New booking" : "Balance paid"}: ${d.service} — ${d.date} ${d.time}`;
  const adminRows: [string, string][] = [
    ["Client", b.clientName],
    ["Email", b.clientEmail],
    ["Phone", b.clientPhone],
    ...(b.notes ? ([["Allergies / notes", b.notes]] as [string, string][]) : []),
    ...rows,
  ];
  const adminSms = `${isDeposit ? "NEW BOOKING" : "BALANCE PAID"}: ${b.clientName} — ${d.service}, ${d.date} ${d.time}. Paid ${formatUSD(chargedCents)}. Code ${b.bookingCode}`;

  const jobs: Promise<unknown>[] = [
    sendEmail(b.clientEmail, clientSubject, emailShell(isDeposit ? "You're booked! ✨" : "Payment received ✨", rows, clientFooter), clientSms),
    sendSms(b.clientPhone, clientSms),
  ];
  if (process.env.ADMIN_EMAIL)
    jobs.push(sendEmail(process.env.ADMIN_EMAIL, adminSubject, emailShell(adminSubject, adminRows, "Logged automatically by the booking system."), adminSms));
  if (process.env.ADMIN_PHONE) jobs.push(sendSms(process.env.ADMIN_PHONE, adminSms));
  await dispatch(jobs);
}

/** 30-minute reminder to client + admin (triggered by the cron route). */
export async function notifyAppointmentReminder(b: BookingWithService) {
  const d = details(b);
  const rows: [string, string][] = [
    ["Service", d.service],
    ...(d.addOns ? ([["Add-ons", d.addOns]] as [string, string][]) : []),
    ["Time", d.time],
    ["Code", b.bookingCode],
    ["Balance due", d.balance],
  ];
  const clientSms = `${SALON.name}: Reminder — your ${d.service} appointment starts at ${d.time} (in 30 min). ${SALON.fullAddress}.${
    d.hasBalance ? ` Balance due: ${d.balance}.` : ""
  }`;
  const adminSms = `REMINDER: ${b.clientName} (${b.clientPhone}) — ${d.service} at ${d.time}. Balance ${d.balance}.`;

  const jobs: Promise<unknown>[] = [
    sendEmail(
      b.clientEmail,
      `Starting in 30 minutes: ${d.service} at ${d.time}`,
      emailShell("See you in 30 minutes! 💛", rows, `Find us at ${SALON.fullAddress}. <a href="${SALON.mapsUrl}">Open in Maps</a>.`),
      clientSms,
    ),
    sendSms(b.clientPhone, clientSms),
  ];
  if (process.env.ADMIN_EMAIL)
    jobs.push(sendEmail(process.env.ADMIN_EMAIL, `⏰ In 30 min: ${b.clientName} — ${d.service}`, emailShell("Upcoming client", [["Client", b.clientName], ["Phone", b.clientPhone], ...rows], ""), adminSms));
  if (process.env.ADMIN_PHONE) jobs.push(sendSms(process.env.ADMIN_PHONE, adminSms));
  await dispatch(jobs);
}

/** A payment arrived that could not be honoured and was auto-refunded. */
export async function notifyAdminRefund(b: BookingWithService, cents: number) {
  const d = details(b);
  const msg = `AUTO-REFUND ${formatUSD(cents)}: ${b.clientName} (${b.clientEmail}, ${b.clientPhone}) for ${d.service} ${d.date} ${d.time}, code ${b.bookingCode}. Slot conflict or duplicate payment — please follow up.`;
  const jobs: Promise<unknown>[] = [];
  if (process.env.ADMIN_EMAIL) jobs.push(sendEmail(process.env.ADMIN_EMAIL, "⚠️ Payment auto-refunded", `<p>${esc(msg)}</p>`, msg));
  if (process.env.ADMIN_PHONE) jobs.push(sendSms(process.env.ADMIN_PHONE, msg));
  await dispatch(jobs);
}
