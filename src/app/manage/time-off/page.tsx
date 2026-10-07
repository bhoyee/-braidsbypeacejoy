import Link from "next/link";
import { redirect } from "next/navigation";
import { RestOfTodayButton, TimeOffForm } from "@/components/manage/TimeOffForm";
import { isAdmin } from "@/lib/admin-auth";
import { listTimeOff } from "@/lib/manage";
import { formatSalonDate, formatSalonTime, salonDateKey } from "@/lib/time";
import { removeTimeOffAction } from "../actions";

export const dynamic = "force-dynamic";

/** Owner time off: block whole days, several days or part of a day so clients can't book them. */
export default async function TimeOffPage() {
  if (!(await isAdmin())) redirect("/manage");
  const blocks = await listTimeOff();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <Link href="/manage" className="text-sm font-semibold text-royal-700 hover:underline">
        ← All bookings
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Time off</h1>
          <p className="mt-2 text-sm text-navy-900/70">Block days or hours you&apos;re not available. All times are Maryland time.</p>
        </div>
        <RestOfTodayButton />
      </div>

      <div className="mt-6">
        <TimeOffForm today={salonDateKey(new Date())} />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-900/5">
        <h2 className="font-display text-xl text-navy-900">Upcoming time off</h2>
        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-navy-900/60">Nothing blocked — you&apos;re open every day, 8 AM – 7 PM.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-900/5">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-navy-900">{b.label}</p>
                  {b.note && <p className="text-sm text-navy-900/60">{b.note}</p>}
                  {b.clashes.length > 0 && (
                    <p className="mt-1 text-sm text-orange-800">
                      ⚠️ {b.clashes.length} booking{b.clashes.length === 1 ? "" : "s"} inside this time:{" "}
                      {b.clashes.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && ", "}
                          <Link href={`/manage/b/${c.id}`} className="font-semibold text-royal-700 hover:underline">
                            {c.clientName}
                          </Link>{" "}
                          ({formatSalonDate(c.appointmentAt).split(",").slice(1, 2).join("").trim()} {formatSalonTime(c.appointmentAt).replace(/ E[DS]T$/, "")})
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <form action={removeTimeOffAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
