import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Booking, Service } from "@prisma/client";
import { addOnsSummary } from "./addons";
import { SALON } from "./config";
import { esc, googleCalendarLink, renderEmail, siteBase, type EmailButton, type EmailRow } from "./email-template";
import { PREP_CHECKLIST } from "./policies";
import { formatDuration, formatSalonDate, formatSalonTime, formatUSD } from "./time";

type BookingWithService = Booking & { service: Service };

/* ------------------------------------------------------------------ */
/* Email (cPanel mailbox) — if SMTP isn't configured, messages are logged. */
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

/**
 * WhatsApp alert to the OWNER via CallMeBot (free; for messaging your own number).
 * Set WHATSAPP_ALERT_NUMBER (+1...) and CALLMEBOT_API_KEY in .env; otherwise skipped.
 * Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */
export async function sendWhatsAppAlert(text: string) {
  const phone = process.env.WHATSAPP_ALERT_NUMBER?.trim();
  const apikey = process.env.CALLMEBOT_API_KEY?.trim();
  if (!phone || !apikey) return console.info(`[whatsapp:skipped] ${text.split("\n")[0]}`);
  const url = `https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone, text, apikey })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const body = await res.text();
  // CallMeBot answers 200 even for some errors, so check the text too.
  if (!res.ok || /error|invalid|not\s+allowed|wrong/i.test(body)) {
    throw new Error(`CallMeBot ${res.status}: ${body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)}`);
  }
}

/** Sends every message, logging failures instead of throwing on the first one. */
async function dispatch(jobs: Promise<unknown>[]) {
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("[notify] delivery failed", r.reason);
}

/* ------------------------------------------------------------------ */
/* Email content                                                       */
/* ------------------------------------------------------------------ */

function details(b: BookingWithService) {
  const balanceCents = Math.max(0, b.totalCents - b.amountPaidCents);
  const base = siteBase();
  return {
    date: formatSalonDate(b.appointmentAt),
    time: formatSalonTime(b.appointmentAt),
    service: b.service.name,
    duration: formatDuration(b.service.durationMin),
    balance: formatUSD(balanceCents),
    hasBalance: balanceCents > 0,
    addOns: addOnsSummary(b),
    firstName: b.clientName.split(" ")[0],
    payUrl: `${base}/pay?code=${b.bookingCode}`,
    calendarUrl: googleCalendarLink({
      title: `Braids by Peace Joy — ${b.service.name}`,
      start: b.appointmentAt,
      end: b.endAt,
      details: `Booking code ${b.bookingCode}. ${SALON.fullAddress}. Call/text ${SALON.phone}.`,
    }),
  };
}

/** The appointment rows shared by client and owner emails. */
function bookingRows(b: BookingWithService, d: ReturnType<typeof details>): EmailRow[] {
  return [
    { label: "Style", value: `${d.service} (${d.duration})` },
    ...(d.addOns ? [{ label: "Add-ons", value: `${d.addOns} (+${formatUSD(b.addOnsCents)})` }] : []),
    { label: "Date", value: d.date },
    { label: "Time", value: d.time },
    { label: "Total", value: formatUSD(b.totalCents) },
    { label: "Paid so far", value: formatUSD(b.amountPaidCents) },
    { label: "Balance due", value: d.balance, strong: d.hasBalance },
  ];
}

const PREP = PREP_CHECKLIST.slice(0, 5).map((p) => p.body);
const directions: EmailButton = { label: "Get directions", href: SALON.mapsUrl };
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Instant alert to client + owner after a verified Stripe payment. */
export async function notifyBookingConfirmed(b: BookingWithService, kind: "DEPOSIT" | "BALANCE", chargedCents: number) {
  const d = details(b);
  const isDeposit = kind === "DEPOSIT";

  // ── Client ──
  const clientHtml = isDeposit
    ? renderEmail({
        preheader: `Confirmed: ${d.service} on ${d.date} at ${d.time}. Code ${b.bookingCode}.`,
        eyebrow: "Booking confirmed",
        title: `You're booked, ${d.firstName}! ✨`,
        intro: `Your <strong>${formatUSD(chargedCents)}</strong> deposit is in and your appointment slot is locked. We can't wait to see you.`,
        highlight: { label: "Booking code", value: b.bookingCode },
        rows: bookingRows(b, d),
        buttons: [
          ...(d.hasBalance ? [{ label: `Pay ${d.balance} balance`, href: d.payUrl, primary: true }] : []),
          { label: "Add to Google Calendar", href: d.calendarUrl },
          directions,
        ],
        sections: [{ title: "Before your appointment", items: PREP }],
        note: `${
          d.hasBalance
            ? `Pay your balance online, by <strong>Cash App ${esc(SALON.cashApp)}</strong> or <strong>Zelle ${esc(SALON.zelle)}</strong> (put your code ${b.bookingCode} in the note), or at your appointment.<br><br>`
            : ""
        }Your deposit is non-refundable. To cancel or reschedule, reply to this email or text <a href="${SALON.smsHref}" style="color:#1e3a8a">${esc(SALON.phone)}</a> at least <strong>72 hours</strong> before your appointment.`,
      })
    : renderEmail({
        preheader: `Payment of ${formatUSD(chargedCents)} received — ${d.service} on ${d.date}.`,
        eyebrow: "Payment received",
        title: d.hasBalance ? `Thank you, ${d.firstName}!` : `You're all paid up, ${d.firstName}! 💛`,
        intro: `We've received your payment of <strong>${formatUSD(chargedCents)}</strong>.${d.hasBalance ? "" : " Your balance is fully cleared."}`,
        highlight: { label: "Booking code", value: b.bookingCode },
        rows: bookingRows(b, d),
        buttons: [{ label: "Add to Google Calendar", href: d.calendarUrl }, directions],
      });

  const clientText = isDeposit
    ? [
        `You're booked, ${d.firstName}!`,
        "",
        `${d.service} — ${d.date} at ${d.time}`,
        `Booking code: ${b.bookingCode}`,
        `Paid today: ${formatUSD(chargedCents)} · Balance due: ${d.balance}`,
        "",
        `Pay your balance: ${d.payUrl}`,
        `Add to calendar: ${d.calendarUrl}`,
        "",
        `${SALON.fullAddress} · ${SALON.phone}`,
      ].join("\n")
    : [
        `Payment received — ${formatUSD(chargedCents)}`,
        "",
        `${d.service} — ${d.date} at ${d.time}`,
        `Booking code: ${b.bookingCode}`,
        `Balance due: ${d.balance}`,
        "",
        `${SALON.fullAddress} · ${SALON.phone}`,
      ].join("\n");

  // ── Owner ──
  const ownerSubject = `💰 ${isDeposit ? "New booking" : "Balance paid"}: ${b.clientName} — ${d.service}, ${d.date} ${d.time}`;
  const ownerHtml = renderEmail({
    preheader: `${b.clientName} · ${d.service} · ${d.date} ${d.time} · paid ${formatUSD(chargedCents)}`,
    eyebrow: isDeposit ? "New booking" : "Balance paid",
    signoff: false,
    title: `${b.clientName} — ${d.service}`,
    intro: `${isDeposit ? "A new appointment was booked" : "A balance payment came in"} and <strong>${formatUSD(chargedCents)}</strong> was paid online.`,
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: [
      { label: "Client", value: b.clientName },
      { label: "Phone", value: b.clientPhone },
      { label: "Email", value: b.clientEmail },
      ...(b.notes ? [{ label: "Allergies / notes", value: b.notes }] : []),
      ...bookingRows(b, d),
    ],
    buttons: [
      { label: "Call client", href: telHref(b.clientPhone), primary: true },
      { label: "Email client", href: `mailto:${b.clientEmail}` },
      { label: "Add to Google Calendar", href: d.calendarUrl },
    ],
  });
  const ownerText = `${isDeposit ? "NEW BOOKING" : "BALANCE PAID"}: ${b.clientName} (${b.clientPhone}, ${b.clientEmail}) — ${d.service}, ${d.date} ${d.time}. Paid ${formatUSD(chargedCents)}. Balance ${d.balance}. Code ${b.bookingCode}.${b.notes ? ` Notes: ${b.notes}` : ""}`;

  const jobs: Promise<unknown>[] = [
    sendEmail(
      b.clientEmail,
      isDeposit ? `You're booked! ${d.service} — ${d.date} at ${d.time}` : `Payment received — ${d.service} on ${d.date}`,
      clientHtml,
      clientText,
    ),
  ];
  if (process.env.ADMIN_EMAIL) jobs.push(sendEmail(process.env.ADMIN_EMAIL, ownerSubject, ownerHtml, ownerText));
  jobs.push(
    sendWhatsAppAlert(
      [
        `💰 *${isDeposit ? "NEW BOOKING" : "BALANCE PAID"}* — ${SALON.name}`,
        `👤 ${b.clientName} · ${b.clientPhone}`,
        `💇🏾‍♀️ ${d.service}${d.addOns ? ` + ${d.addOns}` : ""}`,
        `📅 ${d.date} at ${d.time}`,
        `💵 Paid ${formatUSD(chargedCents)} · Balance ${d.balance}`,
        `🔖 Code ${b.bookingCode}`,
        ...(b.notes ? [`📝 ${b.notes}`] : []),
      ].join("\n"),
    ),
  );
  await dispatch(jobs);
}

/** 30-minute reminder to client + owner (triggered by the cron route). */
export async function notifyAppointmentReminder(b: BookingWithService) {
  const d = details(b);
  const clientHtml = renderEmail({
    preheader: `Your ${d.service} appointment starts at ${d.time}.`,
    eyebrow: "Appointment reminder",
    title: `See you in 30 minutes, ${d.firstName}! 💛`,
    intro: `Your appointment starts at <strong>${esc(d.time)}</strong> at PHENIX Salon Suites, Suite 101.`,
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: [
      { label: "Style", value: d.service },
      ...(d.addOns ? [{ label: "Add-ons", value: d.addOns }] : []),
      { label: "Time", value: d.time },
      { label: "Balance due", value: d.balance, strong: d.hasBalance },
    ],
    buttons: [{ ...directions, primary: true }, ...(d.hasBalance ? [{ label: "Pay balance now", href: d.payUrl }] : [])],
    note: `Running late? Call or text <a href="${SALON.phoneHref}" style="color:#1e3a8a">${esc(SALON.phone)}</a>.`,
  });
  const clientText = `Reminder: your ${d.service} appointment starts at ${d.time} (in 30 minutes). ${SALON.fullAddress}.${d.hasBalance ? ` Balance due: ${d.balance}.` : ""} Running late? Call/text ${SALON.phone}.`;

  const ownerHtml = renderEmail({
    preheader: `${b.clientName} at ${d.time} — ${d.service}`,
    eyebrow: "Upcoming client",
    signoff: false,
    title: `${b.clientName} in 30 minutes`,
    rows: [
      { label: "Client", value: b.clientName },
      { label: "Phone", value: b.clientPhone },
      ...(b.notes ? [{ label: "Allergies / notes", value: b.notes }] : []),
      { label: "Style", value: d.service },
      ...(d.addOns ? [{ label: "Add-ons", value: d.addOns }] : []),
      { label: "Time", value: d.time },
      { label: "Balance due", value: d.balance, strong: d.hasBalance },
    ],
    buttons: [{ label: "Call client", href: telHref(b.clientPhone), primary: true }],
  });
  const ownerText = `REMINDER: ${b.clientName} (${b.clientPhone}) — ${d.service} at ${d.time}. Balance ${d.balance}.`;

  const jobs: Promise<unknown>[] = [sendEmail(b.clientEmail, `Starting in 30 minutes: ${d.service} at ${d.time}`, clientHtml, clientText)];
  if (process.env.ADMIN_EMAIL) jobs.push(sendEmail(process.env.ADMIN_EMAIL, `⏰ In 30 min: ${b.clientName} — ${d.service}`, ownerHtml, ownerText));
  jobs.push(sendWhatsAppAlert(`⏰ *In 30 min:* ${b.clientName} (${b.clientPhone}) — ${d.service} at ${d.time}. Balance ${d.balance}.`));
  await dispatch(jobs);
}

/** A payment arrived that could not be honoured and was auto-refunded (owner only). */
export async function notifyAdminRefund(b: BookingWithService, cents: number) {
  const d = details(b);
  const msg = `AUTO-REFUND ${formatUSD(cents)}: ${b.clientName} (${b.clientEmail}, ${b.clientPhone}) for ${d.service} ${d.date} ${d.time}, code ${b.bookingCode}. Slot conflict or duplicate payment — please follow up.`;
  const html = renderEmail({
    preheader: `Refunded ${formatUSD(cents)} to ${b.clientName}`,
    eyebrow: "Action needed",
    signoff: false,
    title: `Payment auto-refunded: ${formatUSD(cents)}`,
    intro:
      "A payment came in that couldn't be honoured (the slot was taken a moment earlier, or the balance was already paid), so it was refunded automatically. Please reach out to the client.",
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: [
      { label: "Client", value: b.clientName },
      { label: "Phone", value: b.clientPhone },
      { label: "Email", value: b.clientEmail },
      { label: "Style", value: d.service },
      { label: "Requested time", value: `${d.date} · ${d.time}` },
      { label: "Refunded", value: formatUSD(cents), strong: true },
    ],
    buttons: [
      { label: "Call client", href: telHref(b.clientPhone), primary: true },
      { label: "Email client", href: `mailto:${b.clientEmail}` },
    ],
  });
  const jobs: Promise<unknown>[] = [];
  if (process.env.ADMIN_EMAIL) jobs.push(sendEmail(process.env.ADMIN_EMAIL, "⚠️ Payment auto-refunded — please follow up", html, msg));
  jobs.push(sendWhatsAppAlert(`⚠️ ${msg}`));
  await dispatch(jobs);
}
