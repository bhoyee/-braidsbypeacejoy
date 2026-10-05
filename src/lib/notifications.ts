import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Booking, Service } from "@prisma/client";
import { addOnsSummary } from "./addons";
import { secret } from "./secrets";
import { priorVisits, unsubscribeHeaders, unsubscribeUrl } from "./clients";
import { DEPOSIT_CENTS, SALON } from "./config";
import { esc, googleCalendarLink, renderEmail, siteBase, type EmailButton, type EmailRow } from "./email-template";
import { PREP_CHECKLIST } from "./policies";
import { formatDuration, formatSalonDate, formatSalonTime, formatUSD, ordinal, salonDateKey } from "./time";

type BookingWithService = Booking & { service: Service };

/* ------------------------------------------------------------------ */
/* Email (cPanel mailbox) — if SMTP isn't configured, messages are logged. */
/* ------------------------------------------------------------------ */

// Settings come from secret() (the .env file exactly as written), so passwords with
// "$" or "#" work and a changed password is picked up without restarting the app.
let mailer: { key: string; transport: Transporter } | null = null;
function getMailer(): Transporter | null {
  const host = secret("SMTP_HOST");
  if (!host) return null;
  const port = Number(secret("SMTP_PORT") ?? 465);
  const user = secret("SMTP_USER");
  const pass = secret("SMTP_PASS");
  const key = JSON.stringify([host, port, user, pass]);
  if (mailer?.key !== key) {
    mailer = { key, transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }) };
  }
  return mailer.transport;
}

export type Delivery = "sent" | "skipped";

export async function sendEmail(to: string, subject: string, html: string, text: string, headers?: Record<string, string>): Promise<Delivery> {
  const t = getMailer();
  if (!t) {
    console.info(`[email:skipped] ${to} — ${subject}`);
    return "skipped";
  }
  await t.sendMail({
    from: secret("EMAIL_FROM") ?? `"${SALON.name}" <${secret("SMTP_USER")}>`,
    to,
    subject,
    html,
    text,
    headers,
  });
  return "sent";
}

/**
 * WhatsApp alert to the OWNER via CallMeBot (free; for messaging your own number).
 * Set WHATSAPP_ALERT_NUMBER (+1...) and CALLMEBOT_API_KEY in .env; otherwise skipped.
 * Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */
export async function sendWhatsAppAlert(text: string): Promise<Delivery> {
  const phone = secret("WHATSAPP_ALERT_NUMBER");
  const apikey = secret("CALLMEBOT_API_KEY");
  if (!phone || !apikey) {
    console.info(`[whatsapp:skipped] ${text.split("\n")[0]}`);
    return "skipped";
  }
  const url = `https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone, text, apikey })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const body = await res.text();
  // CallMeBot answers 200 even for some errors, so check the text too.
  if (!res.ok || /error|invalid|not\s+allowed|wrong/i.test(body)) {
    throw new Error(`CallMeBot ${res.status}: ${body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)}`);
  }
  return "sent";
}

/** Sends every message, logging failures instead of throwing on the first one. */
async function dispatch(jobs: Promise<unknown>[]) {
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("[notify] delivery failed", r.reason);
}

type Job = { label: string; run: () => Promise<Delivery> };

/** Owner alerts for a booking: email (ADMIN_EMAIL) + WhatsApp (CallMeBot). */
function ownerJobs(subject: string, html: string, text: string, whatsapp: string): Job[] {
  const admin = secret("ADMIN_EMAIL");
  return [
    { label: "Owner email", run: async () => (admin ? sendEmail(admin, subject, html, text) : Promise.reject(new Error("ADMIN_EMAIL is not set"))) },
    { label: "Owner WhatsApp", run: () => sendWhatsAppAlert(whatsapp) },
  ];
}

/**
 * Sends every message and records what happened on the booking's activity log
 * (e.g. "Client email ✓ · Owner email ✓ · Owner WhatsApp ✗ CallMeBot 203: APIKey is invalid"),
 * so delivery problems are visible in Manage Bookings, not only in server logs.
 */
async function dispatchLogged(bookingId: string, action: string, jobs: Job[]) {
  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const parts = results.map((r, i) => {
    const label = jobs[i].label;
    if (r.status === "rejected") {
      console.error(`[notify] ${label} failed`, r.reason);
      return `${label} ✗ ${String((r.reason as Error)?.message ?? r.reason).slice(0, 160)}`;
    }
    return r.value === "skipped" ? `${label} – not set up` : `${label} ✓`;
  });
  const { prisma } = await import("./prisma");
  await prisma.activityLog.create({ data: { bookingId, action, detail: parts.join(" · ") } }).catch((e) => console.error("[notify] log", e));
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

// "Running late?" is left out: its line needs its heading, and every email already says how to reach us.
const PREP = PREP_CHECKLIST.filter((p) => p.title !== "Running late?").map((p) => p.body);
const directions: EmailButton = { label: "Get directions", href: SALON.mapsUrl };
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Instant alert to client + owner after a verified Stripe payment. */
export async function notifyBookingConfirmed(b: BookingWithService, kind: "DEPOSIT" | "BALANCE", chargedCents: number) {
  const d = details(b);
  const isDeposit = kind === "DEPOSIT";
  const prior = isDeposit ? await priorVisits(b.clientEmail, b.appointmentAt, b.id) : 0;
  const clientType = prior ? `Returning client — ${ordinal(prior + 1)} visit` : "New client";

  // ── Client ──
  const clientHtml = isDeposit
    ? renderEmail({
        preheader: `Confirmed: ${d.service} on ${d.date} at ${d.time}. Code ${b.bookingCode}.`,
        eyebrow: "Booking confirmed",
        title: prior ? `Welcome back, ${d.firstName}! ✨` : `You're booked, ${d.firstName}! ✨`,
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
      ...(isDeposit ? [{ label: "Client type", value: clientType }] : []),
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

  await dispatchLogged(b.id, isDeposit ? "Booking alerts sent" : "Payment alerts sent", [
    {
      label: "Client email",
      run: () =>
        sendEmail(
          b.clientEmail,
          isDeposit ? `You're booked! ${d.service} — ${d.date} at ${d.time}` : `Payment received — ${d.service} on ${d.date}`,
          clientHtml,
          clientText,
        ),
    },
    ...ownerJobs(
      ownerSubject,
      ownerHtml,
      ownerText,
        [
          `💰 *${isDeposit ? "NEW BOOKING" : "BALANCE PAID"}* — ${SALON.name}`,
          `👤 ${b.clientName} · ${b.clientPhone}`,
          ...(isDeposit ? [prior ? `⭐ ${clientType}` : "🆕 New client"] : []),
          `💇🏾‍♀️ ${d.service}${d.addOns ? ` + ${d.addOns}` : ""}`,
          `📅 ${d.date} at ${d.time}`,
          `💵 Paid ${formatUSD(chargedCents)} · Balance ${d.balance}`,
          `🔖 Code ${b.bookingCode}`,
          ...(b.notes ? [`📝 ${b.notes}`] : []),
        ].join("\n"),
    ),
  ]);
}

/**
 * Appointment reminders to client + owner (triggered by the cron route):
 * "DAY_BEFORE" ≈ 24 hours ahead, "SOON" ≈ 2 hours ahead.
 */
export function appointmentReminderEmails(b: BookingWithService, kind: "DAY_BEFORE" | "SOON", now = new Date()) {
  const d = details(b);
  const sameDay = salonDateKey(b.appointmentAt) === salonDateKey(now);
  const when = sameDay ? "today" : "tomorrow";
  const callText = `<a href="${SALON.smsHref}" style="color:#1e3a8a;white-space:nowrap">${esc(SALON.phone)}</a>`;
  const rows: EmailRow[] = [
    { label: "Style", value: `${d.service} (${d.duration})` },
    ...(d.addOns ? [{ label: "Add-ons", value: d.addOns }] : []),
    { label: "Date", value: d.date },
    { label: "Time", value: d.time },
    { label: "Balance due", value: d.balance, strong: d.hasBalance },
  ];
  const payButton = d.hasBalance ? [{ label: `Pay ${d.balance} balance`, href: d.payUrl }] : [];

  const client =
    kind === "DAY_BEFORE"
      ? {
          subject: `See you ${when}, ${d.firstName}! ${d.service} at ${d.time}`,
          html: renderEmail({
            preheader: `Reminder: ${d.service} ${when} at ${d.time} — PHENIX Salon Suites, Suite 101.`,
            eyebrow: `Your appointment is ${when}`,
            title: `See you ${when}, ${d.firstName}! 💛`,
            intro: `Just a friendly reminder that your appointment is <strong>${when}, ${esc(d.date)} at ${esc(d.time)}</strong>, at PHENIX Salon Suites, Suite 101.`,
            highlight: { label: "Booking code", value: b.bookingCode },
            rows,
            buttons: [
              ...(d.hasBalance ? [{ label: `Pay ${d.balance} balance`, href: d.payUrl, primary: true }] : []),
              { label: "Add to Google Calendar", href: d.calendarUrl, primary: !d.hasBalance },
              directions,
            ],
            sections: [{ title: "Before your appointment", items: PREP }],
            note: `Need to reach us before your appointment? Call or text ${callText}.${
              d.hasBalance
                ? ` You can pay your balance online, by <strong>Cash App ${esc(SALON.cashApp)}</strong> or <strong>Zelle ${esc(SALON.zelle)}</strong> (put your code ${b.bookingCode} in the note), or at your appointment.`
                : ""
            }`,
          }),
          text: [
            `See you ${when}, ${d.firstName}!`,
            "",
            `${d.service} — ${d.date} at ${d.time}`,
            `Booking code: ${b.bookingCode}`,
            `Balance due: ${d.balance}`,
            ...(d.hasBalance ? [`Pay your balance: ${d.payUrl}`] : []),
            "",
            `${SALON.fullAddress}`,
            `Directions: ${SALON.mapsUrl}`,
            `Questions? Call or text ${SALON.phone}.`,
          ].join("\n"),
        }
      : {
          subject: `${sameDay ? "Today" : "Tomorrow"} at ${d.time}: your ${d.service} appointment`,
          html: renderEmail({
            preheader: `Your ${d.service} appointment starts at ${d.time} — Suite 101, PHENIX Salon Suites.`,
            eyebrow: "See you soon",
            title: `See you soon, ${d.firstName}! ✨`,
            intro: `Your appointment starts at <strong>${esc(d.time)} ${when}</strong> at PHENIX Salon Suites, ${esc(SALON.addressLine)}, <strong>Suite 101</strong>.`,
            highlight: { label: "Booking code", value: b.bookingCode },
            rows,
            buttons: [{ ...directions, primary: true }, ...payButton],
            note: `Running late? Please call or text ${callText} so we can plan around it.`,
          }),
          text: `Reminder: your ${d.service} appointment starts at ${d.time} ${when}. ${SALON.fullAddress}.${d.hasBalance ? ` Balance due: ${d.balance} (${d.payUrl}).` : ""} Directions: ${SALON.mapsUrl}. Running late? Call/text ${SALON.phone}.`,
        };

  const lead = kind === "DAY_BEFORE" ? (sameDay ? "Today" : "Tomorrow") : "In 2 hours";
  const emoji = kind === "DAY_BEFORE" ? "📅" : "⏰";
  const owner = {
    subject: `${emoji} ${lead}: ${b.clientName} — ${d.service} at ${d.time}`,
    html: renderEmail({
      preheader: `${b.clientName} · ${d.service} · ${d.date} ${d.time} · balance ${d.balance}`,
      eyebrow: kind === "DAY_BEFORE" ? `Client ${when}` : "Upcoming client",
      signoff: false,
      title: `${b.clientName} — ${kind === "DAY_BEFORE" ? `${when} at ${d.time}` : `in 2 hours (${d.time})`}`,
      rows: [
        { label: "Client", value: b.clientName },
        { label: "Phone", value: b.clientPhone },
        ...(b.notes ? [{ label: "Allergies / notes", value: b.notes }] : []),
        ...rows,
      ],
      buttons: [
        { label: "Call client", href: telHref(b.clientPhone), primary: true },
        { label: "Open booking", href: `${siteBase()}/manage/b/${b.id}` },
      ],
    }),
    text: `${lead.toUpperCase()}: ${b.clientName} (${b.clientPhone}) — ${d.service} at ${d.time}, ${d.date}. Balance ${d.balance}.${b.notes ? ` Notes: ${b.notes}` : ""}`,
    whatsapp: [
      `${emoji} *${lead}:* ${b.clientName} · ${b.clientPhone}`,
      `💇🏾‍♀️ ${d.service}${d.addOns ? ` + ${d.addOns}` : ""}`,
      `📅 ${d.date} at ${d.time}`,
      `💵 Balance ${d.balance}`,
      ...(b.notes ? [`📝 ${b.notes}`] : []),
    ].join("\n"),
  };
  return { client, owner };
}

export async function notifyAppointmentReminder(b: BookingWithService, kind: "DAY_BEFORE" | "SOON") {
  const { client, owner } = appointmentReminderEmails(b, kind);
  await dispatchLogged(b.id, kind === "DAY_BEFORE" ? "24-hour reminder alerts" : "2-hour reminder alerts", [
    { label: "Client email", run: () => sendEmail(b.clientEmail, client.subject, client.html, client.text) },
    ...ownerJobs(owner.subject, owner.html, owner.text, owner.whatsapp),
  ]);
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
  const admin = secret("ADMIN_EMAIL");
  if (admin) jobs.push(sendEmail(admin, "⚠️ Payment auto-refunded — please follow up", html, msg));
  jobs.push(sendWhatsAppAlert(`⚠️ ${msg}`));
  await dispatch(jobs);
}

/** Owner cancelled the booking (from /manage). */
export async function notifyBookingCancelled(b: BookingWithService, opts: { refunded: boolean; reason: string }) {
  const d = details(b);
  const base = siteBase();
  const html = renderEmail({
    preheader: `Your ${d.service} appointment on ${d.date} has been cancelled.`,
    eyebrow: "Appointment cancelled",
    title: `Your appointment has been cancelled`,
    intro: `Hi ${esc(d.firstName)}, your appointment below has been cancelled${opts.reason ? `: <em>${esc(opts.reason)}</em>` : "."}`,
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: [
      { label: "Style", value: d.service },
      { label: "Was booked for", value: `${d.date} · ${d.time}` },
      { label: "Deposit", value: opts.refunded ? `${formatUSD(DEPOSIT_CENTS)} refunded` : "Non-refundable (per our policy)", strong: opts.refunded },
    ],
    buttons: [{ label: "Book a new appointment", href: `${base}/book`, primary: true }],
    note: opts.refunded
      ? "Your deposit has been refunded to your original payment method. Refunds usually appear within 5–10 business days."
      : `Questions? Call or text <a href="${SALON.phoneHref}" style="color:#1e3a8a">${esc(SALON.phone)}</a>.`,
  });
  const text = `Your ${d.service} appointment on ${d.date} at ${d.time} (code ${b.bookingCode}) has been cancelled.${opts.reason ? ` Reason: ${opts.reason}.` : ""} ${opts.refunded ? `Your ${formatUSD(DEPOSIT_CENTS)} deposit has been refunded (5–10 business days).` : "The deposit is non-refundable per our policy."} Book again: ${base}/book`;
  await dispatch([sendEmail(b.clientEmail, `Appointment cancelled — ${d.service} on ${d.date}`, html, text)]);
}

/** Owner recorded a Cash App / Zelle / cash payment (from /manage). */
export async function notifyManualPayment(b: BookingWithService, amountCents: number, methodLabel: string) {
  const d = details(b);
  const html = renderEmail({
    preheader: `Payment of ${formatUSD(amountCents)} received by ${methodLabel}.`,
    eyebrow: "Payment received",
    title: d.hasBalance ? `Thank you, ${d.firstName}!` : `You're all paid up, ${d.firstName}! 💛`,
    intro: `We've received your <strong>${esc(methodLabel)}</strong> payment of <strong>${formatUSD(amountCents)}</strong>.${d.hasBalance ? "" : " Your balance is fully cleared."}`,
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: bookingRows(b, d),
    buttons: [
      ...(d.hasBalance ? [{ label: `Pay ${d.balance} balance`, href: d.payUrl, primary: true }] : []),
      { label: "Add to Google Calendar", href: d.calendarUrl },
      directions,
    ],
  });
  const text = `Payment received: ${formatUSD(amountCents)} by ${methodLabel} for ${d.service} on ${d.date} at ${d.time} (code ${b.bookingCode}). Balance due: ${d.balance}.`;
  await dispatch([sendEmail(b.clientEmail, `Payment received — ${formatUSD(amountCents)}`, html, text)]);
}

/* ------------------------------------------------------------------ */
/* Follow-ups (sent by the cron route; clients can unsubscribe)        */
/* ------------------------------------------------------------------ */

/** "How was your visit?" — asks for a Google review and a social-media tag. */
export function reviewRequestEmail(b: BookingWithService) {
  const d = details(b);
  const google = process.env.GOOGLE_REVIEW_URL?.trim() || SALON.googleReviewUrl;
  const unsub = unsubscribeUrl(b.clientEmail);
  const html = renderEmail({
    preheader: `Thank you for visiting, ${d.firstName}! A quick review means the world to us.`,
    eyebrow: "Thank you for visiting",
    title: `How do you love your ${d.service}, ${d.firstName}? 💛`,
    intro:
      "Thank you for trusting us with your hair! If you enjoyed your visit, a quick review helps other women find us — it only takes a minute.",
    buttons: [
      { label: "⭐ Leave a Google review", href: google, primary: true },
      { label: "Tag us on Instagram", href: SALON.socials.instagram },
      { label: "Tag us on TikTok", href: SALON.socials.tiktok },
    ],
    note: `Post a photo of your new look and tag <strong>@braidsbypeacejoy</strong> — we love to share our clients' styles! Anything we could do better? Just reply to this email.`,
    unsubscribeUrl: unsub,
  });
  const text = [
    `Thank you for visiting, ${d.firstName}!`,
    "",
    "If you enjoyed your visit, a quick review helps other women find us:",
    google,
    "",
    `Share your new look and tag us on Instagram: ${SALON.socials.instagram}`,
    `or TikTok: ${SALON.socials.tiktok}`,
    "",
    `Unsubscribe from follow-up emails: ${unsub}`,
  ].join("\n");
  return { subject: `How do you love your new ${d.service}? 💛`, html, text };
}

export async function notifyReviewRequest(b: BookingWithService) {
  const m = reviewRequestEmail(b);
  await sendEmail(b.clientEmail, m.subject, m.html, m.text, unsubscribeHeaders(b.clientEmail));
}

/**
 * "Come back" sequence after the last visit (see src/lib/followups.ts):
 * step 1 ≈ 2 months, step 2 ≈ 3 months, step 3 ≈ 4 months (the last one).
 * Every email links straight to booking the same style again.
 */
export function retentionEmail(b: BookingWithService, step: 1 | 2 | 3 = 2, months = 3) {
  const d = details(b);
  const base = siteBase();
  const unsub = unsubscribeUrl(b.clientEmail);
  const rebook = `${base}/book?service=${encodeURIComponent(b.service.slug)}`;
  const since = `about ${months} month${months === 1 ? "" : "s"}`;
  const style = `<strong>${esc(d.service)}</strong>`;

  const copy = {
    1: {
      subject: `Ready for your next look, ${d.firstName}? ✨`,
      preheader: `It's been ${since} since your ${d.service} — book your next appointment before your favorite times are taken.`,
      eyebrow: "Time for your next install",
      title: `Ready for your next look, ${d.firstName}? ✨`,
      intro: `It's been ${since} since your ${style}. To keep your hair and edges healthy, most braids are best taken down around 6–8 weeks — so now is the perfect time to book your next appointment and get the day and time you want.`,
      textIntro: `It's been ${since} since your ${d.service}. Most braids are best taken down around 6–8 weeks, so now is a great time to book your next appointment.`,
      last: false,
    },
    2: {
      subject: `Time for a refresh, ${d.firstName}? ✨`,
      preheader: `It's been ${since} since your ${d.service} — ready for a fresh new look?`,
      eyebrow: "Time for a refresh",
      title: `Time for a refresh, ${d.firstName}? ✨`,
      intro: `It's been ${since} since your ${style}. Give your hair and edges some love with a fresh install — we'd love to have you back in the chair.`,
      textIntro: `It's been ${since} since your ${d.service}. We'd love to have you back in the chair!`,
      last: false,
    },
    3: {
      subject: `We miss you, ${d.firstName} 💛`,
      preheader: `It's been ${since} — your chair is waiting whenever you're ready.`,
      eyebrow: "We miss you",
      title: `We miss you, ${d.firstName} 💛`,
      intro: `It's been ${since} since we last did your hair, and we'd love to see you again. Whenever you're ready, your chair is waiting — booking online takes less than a minute.`,
      textIntro: `It's been ${since} since we last did your hair, and we'd love to see you again. Whenever you're ready, your chair is waiting.`,
      last: true,
    },
  }[step];

  const html = renderEmail({
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    title: copy.title,
    intro: copy.intro,
    buttons: [
      { label: `Book ${d.service} again`, href: rebook, primary: true },
      { label: "See all styles", href: `${base}/styles` },
    ],
    note: `Open daily 8 AM – 7 PM. A ${formatUSD(DEPOSIT_CENTS)} deposit holds your slot. Questions? Call or text <a href="${SALON.smsHref}" style="color:#1e3a8a;white-space:nowrap">${esc(SALON.phone)}</a>.${
      copy.last ? "<br><br>This is our last reminder — we won't email you about this again." : ""
    }`,
    unsubscribeUrl: unsub,
  });
  const text = [
    copy.title.replace(/ [✨💛]$/u, ""),
    "",
    copy.textIntro,
    `Book again: ${rebook}`,
    `See all styles: ${base}/styles`,
    ...(copy.last ? ["", "This is our last reminder — we won't email you about this again."] : []),
    "",
    `${SALON.fullAddress} · ${SALON.phone}`,
    `Unsubscribe from follow-up emails: ${unsub}`,
  ].join("\n");
  return { subject: copy.subject, html, text };
}

export async function notifyRetention(b: BookingWithService, step: 1 | 2 | 3, months: number) {
  const m = retentionEmail(b, step, months);
  await sendEmail(b.clientEmail, m.subject, m.html, m.text, unsubscribeHeaders(b.clientEmail));
}

/** Owner moved the appointment (from /manage). Tells the client the new date and time. */
export async function notifyBookingRescheduled(b: BookingWithService, previousStart: Date) {
  const d = details(b);
  const was = `${formatSalonDate(previousStart)} at ${formatSalonTime(previousStart)}`;
  const html = renderEmail({
    preheader: `New time: ${d.service} on ${d.date} at ${d.time}.`,
    eyebrow: "Appointment updated",
    title: `Your new appointment time, ${d.firstName}`,
    intro: `Your appointment has been moved to <strong>${esc(d.date)} at ${esc(d.time)}</strong>. Your deposit and booking code stay the same.`,
    highlight: { label: "Booking code", value: b.bookingCode },
    rows: [{ label: "Previously", value: was }, ...bookingRows(b, d)],
    buttons: [
      { label: "Add to Google Calendar", href: d.calendarUrl, primary: true },
      ...(d.hasBalance ? [{ label: `Pay ${d.balance} balance`, href: d.payUrl }] : []),
      directions,
    ],
    note: `Didn't expect this change, or need a different time? Call or text <a href="${SALON.smsHref}" style="color:#1e3a8a;white-space:nowrap">${esc(SALON.phone)}</a>.`,
  });
  const text = `Your ${d.service} appointment (code ${b.bookingCode}) has been moved to ${d.date} at ${d.time} (previously ${was}). ${SALON.fullAddress}. Add to calendar: ${d.calendarUrl}. Questions? Call/text ${SALON.phone}.`;
  await dispatch([sendEmail(b.clientEmail, `New time: ${d.service} on ${d.date} at ${d.time}`, html, text)]);
}
