import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { renderEmail, siteBase } from "./email-template";
import { sendEmail } from "./notifications";
import { prisma } from "./prisma";

// Owner sign-in for /manage: one-time email links + a signed session cookie.
// No passwords. Only the owner email (ADMIN_EMAIL) can ever receive a link.

export const ADMIN_COOKIE = "bbpj_admin";
const SESSION_DAYS = 30;
const LINK_MINUTES = 15;
const MAX_LINKS_PER_15_MIN = 5;
const VERSION_KEY = "admin_session_version";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function secret(): string | null {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  // Derived from the existing CRON_SECRET so no extra setup is needed on the server.
  return process.env.CRON_SECRET ? sha256(`bbpj-admin-session:${process.env.CRON_SECRET}`) : null;
}

export function ownerEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

export function adminConfigured() {
  return Boolean(secret() && ownerEmail());
}

async function sessionVersion(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: VERSION_KEY } });
  return row?.value ?? "1";
}

function sign(payload: string) {
  return createHmac("sha256", secret()!).update(payload).digest("base64url");
}

/** True when the request carries a valid, unexpired, unrevoked owner session. */
export async function isAdmin(): Promise<boolean> {
  if (!secret()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [exp, version, sig] = raw.split(".");
  if (!exp || !version || !sig) return false;
  const expected = sign(`${exp}.${version}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  if (Number(exp) < Date.now()) return false;
  return version === (await sessionVersion());
}

/** Throws unless signed in — call at the top of every owner action. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in");
}

export async function startSession() {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const version = await sessionVersion();
  (await cookies()).set(ADMIN_COOKIE, `${exp}.${version}.${sign(`${exp}.${version}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Invalidates every existing session on every device. */
export async function signOutEverywhere() {
  const next = String(Number(await sessionVersion()) + 1);
  await prisma.setting.upsert({ where: { key: VERSION_KEY }, update: { value: next }, create: { key: VERSION_KEY, value: next } });
}

/**
 * Emails a one-time sign-in link — but only if `email` is the owner address.
 * Always resolves the same way so the form can't be used to discover the address.
 */
export async function requestLoginLink(email: string) {
  const owner = ownerEmail();
  if (!owner || !secret() || email.trim().toLowerCase() !== owner) return;

  const recent = await prisma.adminLoginToken.count({ where: { createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
  if (recent >= MAX_LINKS_PER_15_MIN) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.adminLoginToken.create({
    data: { tokenHash: sha256(token), email: owner, expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) },
  });
  // Housekeeping: drop links older than a day.
  await prisma.adminLoginToken.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });

  const url = `${siteBase()}/manage/verify?token=${token}`;
  if (process.env.NODE_ENV !== "production") console.info(`[dev only] owner sign-in link: ${url.replace(siteBase(), "http://localhost:3000")}`);
  const html = renderEmail({
    preheader: "Your sign-in link for Manage Bookings (valid for 15 minutes).",
    eyebrow: "Manage bookings",
    title: "Sign in to Manage Bookings",
    intro: `Tap the button below to sign in. The link works once and expires in <strong>${LINK_MINUTES} minutes</strong>.`,
    buttons: [{ label: "Sign in", href: url, primary: true }],
    note: "Didn't request this? You can ignore this email — nobody can sign in without this link.",
    signoff: false,
  });
  await sendEmail(owner, "Your sign-in link — Braids by Peace Joy", html, `Sign in to Manage Bookings (valid ${LINK_MINUTES} minutes, one use):\n${url}`);
}

/** Validates and burns a sign-in link. Returns true if it was valid. */
export async function consumeLoginToken(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const row = await prisma.adminLoginToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return false;
  // Mark used atomically so the same link can't be used twice.
  const used = await prisma.adminLoginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return used.count === 1;
}
