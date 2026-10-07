import Link from "next/link";
import { QuickOutcome } from "@/components/manage/BookingActions";
import { StatusBadges } from "@/components/manage/StatusBadges";
import { SignInForm } from "@/components/manage/SignInForm";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { MANAGE_TABS, isDateKey, listBookings, type ManageTab } from "@/lib/manage";
import { formatSalonDate, formatSalonTime, salonDateKey } from "@/lib/time";
import { visitNumbers } from "@/lib/clients";
import { ClientBadge } from "@/components/manage/StatusBadges";
import { signOutAction, signOutEverywhereAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ tab?: string; q?: string; page?: string; date?: string; link?: string }>;

const href = (p: { tab?: string; q?: string; page?: number; date?: string }) => {
  const sp = new URLSearchParams();
  if (p.tab && p.tab !== "upcoming") sp.set("tab", p.tab);
  if (p.date) sp.set("date", p.date);
  if (p.q) sp.set("q", p.q);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return `/manage${s ? `?${s}` : ""}`;
};

export default async function ManagePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  if (!adminConfigured()) {
    return (
      <div className="mx-auto mt-[20vh] max-w-md rounded-3xl bg-white p-8 text-center shadow">
        <h1 className="font-display text-2xl text-navy-900">Not set up yet</h1>
        <p className="mt-2 text-sm text-navy-900/70">ADMIN_EMAIL and CRON_SECRET must be set in the server&apos;s .env file.</p>
      </div>
    );
  }
  if (!(await isAdmin())) return <SignInForm linkInvalid={sp.link === "invalid"} />;

  const tab = (MANAGE_TABS.some((t) => t.id === sp.tab) ? sp.tab : "upcoming") as ManageTab;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const date = isDateKey(sp.date) ? sp.date : undefined;
  const data = await listBookings(tab, q, page, date);
  const visitNo = await visitNumbers(data.items);
  const now = new Date();

  // Group the page's bookings under day headings ("Today", "Tomorrow", "Tuesday, October 6").
  const todayKey = salonDateKey(now);
  const dayLabel = (d: Date) => {
    const key = salonDateKey(d);
    const offset = Math.round((Date.parse(key) - Date.parse(todayKey)) / 86_400_000);
    const name = formatSalonDate(d).replace(`, ${todayKey.slice(0, 4)}`, "");
    return offset === 0 ? `Today · ${name}` : offset === 1 ? `Tomorrow · ${name}` : offset === -1 ? `Yesterday · ${name}` : name;
  };
  const groups: { label: string; items: typeof data.items }[] = [];
  for (const b of data.items) {
    const label = dayLabel(b.appointmentAt);
    if (groups.at(-1)?.label === label) groups.at(-1)!.items.push(b);
    else groups.push({ label, items: [b] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Manage Bookings</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/manage/time-off" className="rounded-full bg-purple-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-purple-800">
            🗓 Time off
          </Link>
          <Link href="/manage/alerts" className="rounded-full bg-white px-4 py-2 font-semibold text-navy-900 ring-1 ring-navy-900/15 hover:bg-cream">
            🔔 Alerts check
          </Link>
          <form action={signOutAction}>
            <button className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700">Sign out</button>
          </form>
          <form action={signOutEverywhereAction}>
            <button className="rounded-full px-3 py-2 font-medium text-red-600 hover:bg-red-50 hover:text-red-700" title="Sign out on every phone and computer">
              Sign out everywhere
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <nav aria-label="Booking lists" className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2">
          {MANAGE_TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={href({ tab: t.id, q })}
                aria-current={!date && t.id === tab ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  !date && t.id === tab
                    ? "bg-royal-700 text-white"
                    : t.id === "review" && data.counts.review > 0
                      ? "bg-orange-50 text-orange-800 ring-1 ring-orange-300 hover:bg-orange-100"
                      : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-2 text-[11px] ${!date && t.id === tab ? "bg-white/20" : "bg-navy-900/5 text-navy-900/60"}`}>{data.counts[t.id]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Search + jump to a date */}
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" role="search">
        {tab !== "upcoming" && !date && <input type="hidden" name="tab" value={tab} />}
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-700" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email or booking code"
            className="w-full rounded-full border border-navy-900/15 bg-white py-3 pl-12 pr-4 text-navy-900 outline-none focus:border-royal-700 focus:ring-4 focus:ring-royal-700/10"
          />
        </div>
        <label className="flex items-center gap-2 rounded-full border border-navy-900/15 bg-white px-4 text-sm text-navy-900/60 focus-within:border-royal-700">
          <span className="shrink-0">Day</span>
          <input type="date" name="date" defaultValue={date ?? ""} className="w-full bg-transparent py-3 text-navy-900 outline-none" aria-label="Show one day" />
        </label>
        <button className="rounded-full bg-royal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-900">Search</button>
      </form>

      {(date || q) && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-navy-900/70">
          Showing {data.total} booking{data.total === 1 ? "" : "s"}
          {date && (
            <>
              {" "}on <strong className="text-navy-900">{formatSalonDate(salonDayNoon(date))}</strong>
            </>
          )}
          {q && (
            <>
              {" "}matching <strong className="text-navy-900">“{q}”</strong>
            </>
          )}
          <Link href={href({ tab })} className="font-semibold text-royal-700 hover:underline">
            Clear
          </Link>
        </p>
      )}

      {/* List, grouped by day */}
      <div className="mt-6 space-y-6">
        {data.items.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-navy-900/60 shadow-sm">
            {q
              ? `No bookings match “${q}”.`
              : date
                ? "No bookings on this day."
                : tab === "today"
                  ? "No appointments today."
                  : tab === "review"
                    ? "All caught up — every past appointment is marked."
                    : "Nothing here yet."}
          </p>
        )}
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-navy-900/50">
              {g.label}
              <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] tracking-normal">{g.items.length}</span>
            </h2>
            <div className="space-y-3">
              {g.items.map((b) => {
                const needsUpdate = (b.paymentStatus === "DEPOSIT_PAID" || b.paymentStatus === "FULLY_SETTLED") && (!b.outcome || b.outcome === "NOT_UPDATED") && b.appointmentAt <= now;
                return (
                  <div key={b.id} className="group relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy-900/5 transition hover:shadow-lg hover:ring-royal-700/30 sm:p-5">
                    <div className="flex items-center gap-4">
                      <p className="w-20 shrink-0 text-center font-display text-lg font-bold text-navy-900 sm:w-24">
                        {formatSalonTime(b.appointmentAt).replace(/ [A-Z]{3}$/, "")}
                      </p>
                      <div className="min-w-0 flex-1 border-l border-navy-900/10 pl-4">
                        {/* The whole card opens the booking; the quick buttons sit above this link. */}
                        <div className="flex min-w-0 items-center gap-2">
                          <Link href={`/manage/b/${b.id}`} className="truncate font-semibold text-navy-900 after:absolute after:inset-0 after:rounded-2xl">
                            {b.clientName}
                          </Link>
                          <ClientBadge visit={visitNo.get(b.id) ?? 1} />
                        </div>
                        <p className="truncate text-sm text-navy-900/60">
                          {b.service.name} · {b.clientPhone}
                        </p>
                        <div className="mt-2">
                          <StatusBadges b={b} />
                        </div>
                      </div>
                      <ArrowRightIcon className="shrink-0 text-navy-900/30 transition group-hover:translate-x-1 group-hover:text-royal-700" />
                    </div>
                    {needsUpdate && (
                      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-navy-900/5 pt-3 sm:pl-28">
                        <span className="text-xs font-semibold text-orange-700">Did they come?</span>
                        <QuickOutcome id={b.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {data.pageCount > 1 && <Pager page={page} count={data.pageCount} to={(n) => href({ tab, q, date, page: n })} />}
    </div>
  );
}

/** A stable instant inside a salon-local day, for formatting its name. */
function salonDayNoon(date: string) {
  return new Date(`${date}T16:00:00Z`);
}

/** Prev · 1 2 3 … 9 · Next */
function Pager({ page, count, to }: { page: number; count: number; to: (n: number) => string }) {
  const nums = [...new Set([1, page - 1, page, page + 1, count])].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const btn = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold";
  return (
    <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={to(page - 1)} className={`${btn} bg-white text-royal-700 ring-1 ring-navy-900/10 hover:bg-gold-200/60`}>
          ← Prev
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-navy-900/40">…</span>}
          <Link
            href={to(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${n === page ? "bg-royal-700 text-white" : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"}`}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < count && (
        <Link href={to(page + 1)} className={`${btn} bg-white text-royal-700 ring-1 ring-navy-900/10 hover:bg-gold-200/60`}>
          Next →
        </Link>
      )}
    </nav>
  );
}
