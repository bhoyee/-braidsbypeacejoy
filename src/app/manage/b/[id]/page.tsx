import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelForm, NotesForm, OutcomeButtons, RecordPaymentForm } from "@/components/manage/BookingActions";
import { ClientBadge, StatusBadges } from "@/components/manage/StatusBadges";
import { addOnsSummary } from "@/lib/addons";
import { isAdmin } from "@/lib/admin-auth";
import { clientHistory, isUnsubscribed, visitNumbers } from "@/lib/clients";
import { getBooking, PAYMENT_METHODS } from "@/lib/manage";
import { formatDuration, formatSalonDate, formatSalonTime, formatUSD } from "@/lib/time";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = { STRIPE: "Card (online)", ...Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label])) };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/manage");
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();

  const active = b.paymentStatus === "DEPOSIT_PAID" || b.paymentStatus === "FULLY_SETTLED";
  const balance = Math.max(0, b.totalCents - b.amountPaidCents);
  const started = b.appointmentAt <= new Date();
  const addOns = addOnsSummary(b);
  const digits = b.clientPhone.replace(/\D/g, "");
  const [history, visitNo, unsubscribed] = await Promise.all([
    clientHistory(b.clientEmail),
    visitNumbers([b]).then((m) => m.get(b.id) ?? 1),
    isUnsubscribed(b.clientEmail),
  ]);
  const others = history.filter((h) => h.id !== b.id);
  const canRefund = b.payments.some((p) => p.kind === "DEPOSIT" && p.status === "PAID" && p.method === "STRIPE" && p.stripePaymentIntentId);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Link href="/manage" className="text-sm font-semibold text-royal-700 hover:underline">
        ← All bookings
      </Link>

      {b.paymentStatus === "CANCELLED" && b.cancelledAt && (
        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <strong>This booking was cancelled</strong> on {formatSalonDate(b.cancelledAt)} — deposit {b.depositRefunded ? "refunded" : "kept"}.
          The time slot is free again and the client was emailed.
        </p>
      )}
      <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-navy-900/5">
        <div className="braid-texture flex flex-wrap items-start justify-between gap-4 bg-navy-900 p-6 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold-400">{formatSalonDate(b.appointmentAt)}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-bold">
              {b.clientName}
              <ClientBadge visit={visitNo} />
            </h1>
            <p className="mt-1 text-white/80">
              {formatSalonTime(b.appointmentAt)} · {b.service.name} ({formatDuration(b.service.durationMin)})
            </p>
          </div>
          <span className="rounded-full bg-gold-400 px-3 py-1 font-mono text-sm font-bold text-navy-950">{b.bookingCode}</span>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <StatusBadges b={b} />
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Phone" value={b.clientPhone} />
              <Row label="Email" value={b.clientEmail} />
              {addOns && <Row label="Add-ons" value={addOns} />}
              {b.notes && <Row label="Allergies / client notes" value={b.notes} highlight />}
              {b.cancelledAt && <Row label="Cancelled" value={`${formatSalonDate(b.cancelledAt)}${b.cancelReason ? ` — ${b.cancelReason}` : ""}`} />}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:+1${digits.slice(-10)}`} className="rounded-full bg-royal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900">📞 Call</a>
              <a href={`https://wa.me/1${digits.slice(-10)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold text-white hover:brightness-95">WhatsApp</a>
              <a href={`sms:+1${digits.slice(-10)}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-royal-700 ring-1 ring-royal-700/30">Text</a>
              <a href={`mailto:${b.clientEmail}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-royal-700 ring-1 ring-royal-700/30">Email</a>
            </div>
          </div>

          <div className="rounded-2xl bg-cream p-4">
            <h2 className="font-display text-lg text-navy-900">Payments</h2>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-navy-900/10">
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-navy-900/70">
                      {p.kind === "DEPOSIT" ? "Deposit" : "Balance"} · {METHOD_LABEL[p.method] ?? p.method}
                      {p.paidAt && <span className="block text-xs text-navy-900/50">{formatSalonDate(p.paidAt)}</span>}
                      {p.note && <span className="block text-xs text-navy-900/50">{p.note}</span>}
                    </td>
                    <td className={`py-2 text-right font-semibold ${p.status === "REFUNDED" ? "text-red-600 line-through" : "text-navy-900"}`}>
                      {formatUSD(p.amountCents)}
                    </td>
                  </tr>
                ))}
                <tr><td className="py-2 text-navy-900/70">Total</td><td className="py-2 text-right font-semibold">{formatUSD(b.totalCents)}</td></tr>
                <tr><td className="py-2 font-bold text-navy-900">Balance due</td><td className="py-2 text-right text-lg font-bold text-royal-700">{formatUSD(balance)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {active && balance > 0 && <RecordPaymentForm id={b.id} balance={balance} />}
        {active && <OutcomeButtons id={b.id} started={started} current={b.outcome} />}
        <NotesForm id={b.id} notes={b.ownerNotes ?? ""} />
        {active && !b.outcome && <CancelForm id={b.id} canRefund={canRefund} />}
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl text-navy-900">Client history</h2>
          <p className="text-xs text-navy-900/50">
            Matched by email · follow-up emails {unsubscribed ? <strong className="text-red-700">unsubscribed</strong> : "on"}
            {b.reviewRequestSentAt && <> · review request sent {formatSalonDate(b.reviewRequestSentAt).split(",").slice(1).join(",")}</>}
          </p>
        </div>
        {others.length === 0 ? (
          <p className="mt-2 text-sm text-navy-900/60">First booking with this email — a new client.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-900/5 text-sm">
            {others.map((h) => (
              <li key={h.id}>
                <Link href={`/manage/b/${h.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:text-royal-700">
                  <span>
                    <strong className="text-navy-900">{formatSalonDate(h.appointmentAt)}</strong>
                    <span className="text-navy-900/60"> · {h.service.name}</span>
                  </span>
                  <StatusBadges b={h} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {b.activity.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
          <h2 className="font-display text-xl text-navy-900">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {b.activity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="w-40 shrink-0 text-navy-900/50">
                  {formatSalonDate(a.createdAt).split(",").slice(1).join(",")} {formatSalonTime(a.createdAt)}
                </span>
                <span className="text-navy-900">
                  <strong>{a.action}</strong>
                  {a.detail ? ` — ${a.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl bg-gold-200/50 p-3" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-900/50">{label}</dt>
      <dd className="font-medium text-navy-900">{value}</dd>
    </div>
  );
}
