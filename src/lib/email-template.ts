import "server-only";
import { SALON } from "./config";

// Branded HTML email layout. Table-based with inline styles so it renders the same
// in Gmail, Outlook, Apple Mail and phone mail apps (they ignore <style> blocks and
// modern CSS). Every email also ships a plain-text version.

const C = {
  navy: "#0b1a4a",
  navyDeep: "#040b26",
  royal: "#1e3a8a",
  gold: "#ffc72c",
  goldSoft: "#fff4cc",
  cream: "#fffaf0",
  ink: "#1f2937",
  muted: "#6b7280",
  line: "#e5e7eb",
};
const FONT = "Helvetica Neue,Helvetica,Arial,sans-serif";
const SOCIAL_LABELS: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
const SERIF = "Georgia,'Times New Roman',serif";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function siteBase() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://braidsbypeacejoy.com").replace(/\/$/, "");
}

export type EmailRow = { label: string; value: string; strong?: boolean };
export type EmailButton = { label: string; href: string; primary?: boolean };

export type EmailContent = {
  preheader: string; // inbox preview line
  eyebrow: string; // small label above the title
  title: string;
  intro?: string; // trusted HTML (we build it), keep short
  highlight?: { label: string; value: string }; // e.g. booking code
  rows?: EmailRow[];
  buttons?: EmailButton[];
  sections?: { title: string; items: string[] }[]; // e.g. "Before your appointment"
  note?: string; // trusted HTML, small print under the card
  signoff?: boolean; // "With love, Peace Joy" (client emails); off for owner alerts
  unsubscribeUrl?: string; // follow-up emails (reviews, 3-month reminder) carry an opt-out link
};

function button(b: EmailButton) {
  const bg = b.primary ? C.gold : "#ffffff";
  const fg = b.primary ? C.navyDeep : C.royal;
  const border = b.primary ? C.gold : C.royal;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 4px;display:inline-table"><tr>
    <td style="border-radius:999px;background:${bg};border:2px solid ${border}">
      <a href="${esc(b.href)}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:${fg};text-decoration:none;border-radius:999px">${esc(b.label)}</a>
    </td></tr></table>`;
}

export function renderEmail(c: EmailContent): string {
  const base = siteBase();
  const rows = (c.rows ?? [])
    .map(
      (r) => `<tr>
        <td style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.muted};vertical-align:top">${esc(r.label)}</td>
        <td style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:${r.strong ? "17px" : "14px"};font-weight:700;color:${r.strong ? C.royal : C.navy};text-align:right;vertical-align:top">${esc(r.value)}</td>
      </tr>`,
    )
    .join("");

  const sections = (c.sections ?? [])
    .map(
      (s) => `<tr><td style="padding:8px 32px 4px">
        <p style="margin:16px 0 8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.royal}">${esc(s.title)}</p>
        ${s.items
          .map(
            (i) =>
              `<p style="margin:0 0 6px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink}"><span style="color:${C.gold};font-weight:700">&#10003;</span>&nbsp; ${esc(i)}</p>`,
          )
          .join("")}
      </td></tr>`,
    )
    .join("");

  const socials = Object.entries(SALON.socials)
    .map(([k, url]) => `<a href="${esc(url)}" style="color:${C.gold};text-decoration:none;font-weight:600">${SOCIAL_LABELS[k] ?? k}</a>`)
    .join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:#eef1f8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f8"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(11,26,74,.10)">

    <!-- Header -->
    <tr><td align="center" style="background:${C.navy};padding:28px 24px 22px">
      <a href="${base}" style="text-decoration:none">
        <img src="${base}/assets/og-logo.png" width="84" height="84" alt="Braids by Peace Joy" style="display:block;margin:0 auto;border:0;width:84px;height:84px">
      </a>
      <p style="margin:12px 0 0;font-family:${SERIF};font-size:22px;color:#ffffff;letter-spacing:.5px">Braids <span style="color:${C.gold};font-style:italic;font-size:17px">by</span> Peace Joy</p>
      <p style="margin:6px 0 0;font-family:${FONT};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold}">Luxury Braiding Studio</p>
    </td></tr>
    <tr><td style="height:4px;background:${C.gold};line-height:4px;font-size:0">&nbsp;</td></tr>

    <!-- Title -->
    <tr><td style="padding:30px 32px 6px">
      <p style="margin:0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.royal}">${esc(c.eyebrow)}</p>
      <h1 style="margin:8px 0 0;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:700;color:${C.navy}">${esc(c.title)}</h1>
      ${c.intro ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink}">${c.intro}</p>` : ""}
    </td></tr>

    ${
      c.highlight
        ? `<tr><td style="padding:18px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};border-radius:12px"><tr>
        <td style="padding:14px 18px;font-family:${FONT};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c7d2fe;white-space:nowrap">${esc(c.highlight.label)}</td>
        <td align="right" style="padding:14px 18px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:1px;color:${C.gold};white-space:nowrap">${esc(c.highlight.value)}</td>
      </tr></table>
    </td></tr>`
        : ""
    }

    ${
      rows
        ? `<tr><td style="padding:14px 32px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">${rows}</table>
    </td></tr>`
        : ""
    }

    ${
      c.buttons?.length
        ? `<tr><td align="center" style="padding:22px 24px 4px">${c.buttons.map(button).join("")}</td></tr>`
        : ""
    }

    ${sections}

    ${c.note ? `<tr><td style="padding:16px 32px 0"><p style="margin:0;padding:14px 16px;background:${C.cream};border-radius:10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.ink}">${c.note}</p></td></tr>` : ""}

    ${c.signoff === false ? "" : `<tr><td style="padding:28px 32px 0"><p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink}">With love,<br><span style="font-family:${SERIF};font-style:italic;font-size:17px;color:${C.navy}">Peace Joy</span></p></td></tr>`}

    <!-- Footer -->
    <tr><td style="padding:28px 0 0"></td></tr>
    <tr><td style="background:${C.navyDeep};padding:22px 32px;font-family:${FONT};font-size:12px;line-height:1.7;color:#cbd5e1">
      <p style="margin:0"><a href="${esc(SALON.mapsUrl)}" style="color:#ffffff;text-decoration:none">📍 ${esc(SALON.addressLine)} · ${esc(SALON.suite)}</a></p>
      <p style="margin:0"><a href="${SALON.phoneHref}" style="color:#ffffff;text-decoration:none">📞 ${esc(SALON.phone)}</a> &nbsp;·&nbsp; Open daily 8 AM – 7 PM</p>
      <p style="margin:8px 0 0">${socials}</p>
      <p style="margin:10px 0 0;color:#94a3b8;font-size:11px">${
        c.unsubscribeUrl
          ? `You're receiving this because you've visited Braids by Peace Joy. <a href="${esc(c.unsubscribeUrl)}" style="color:#94a3b8">Unsubscribe</a> from follow-up emails.`
          : "You're receiving this email about your appointment with Braids by Peace Joy."
        }
        <a href="${base}/policies" style="color:#94a3b8">Booking policies</a> · <a href="${base}/privacy" style="color:#94a3b8">Privacy</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** "Add to Google Calendar" link for an appointment. */
export function googleCalendarLink(opts: { title: string; start: Date; end: Date; details: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const sp = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.details,
    location: `${SALON.addressLine} (${SALON.suite})`,
  });
  return `https://calendar.google.com/calendar/render?${sp}`;
}
