import Link from "next/link";
import { StatusBadges } from "@/components/manage/StatusBadges";
import { SignInForm } from "@/components/manage/SignInForm";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { MANAGE_TABS, listBookings, type ManageTab } from "@/lib/manage";
import { formatSalonDate, formatSalonTime } from "@/lib/time";
import { signOutAction, signOutEverywhereAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ tab?: string; q?: string; page?: string; link?: string }>;

const href = (p: { tab?: string; q?: string; page?: number }) => {
  const sp = new URLSearchParams();
  if (p.tab && p.tab !== "upcoming") sp.set("tab", p.tab);
  if (p.q) sp.set("q", p.q);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return `/manage${s ? `?${s}` : ""}`;
};

export default async function ManagePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  if (!adminConfigured()) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 text-center shadow">
        <h1 className="font-display text-2xl text-navy-900">Not set up yet</h1>
        <p className="mt-2 text-sm text-navy-900/70">ADMIN_EMAIL and CRON_SECRET must be set in the server&apos;s .env file.</p>
      </div>
    );
  }
  if (!(await isAdmin())) return <SignInForm linkInvalid={sp.link === "invalid"} />;

  const tab = (MANAGE_TABS.some((t) => t.id === sp.tab) ? sp.tab : "upcoming") as ManageTab;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await listBookings(tab, q, page);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-royal-700">Owner area</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Manage Bookings</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <form action={signOutAction}>
            <button className="rounded-full border border-navy-900/15 bg-white px-4 py-2 font-semibold text-navy-900 hover:bg-cream">Sign out</button>
          </form>
          <form action={signOutEverywhereAction}>
            <button className="rounded-full px-3 py-2 text-navy-900/60 hover:text-red-700" title="Sign out on every phone and computer">
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
                aria-current={t.id === tab ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  t.id === tab ? "bg-royal-700 text-white" : "bg-white text-navy-900 ring-1 ring-navy-900/10 hover:bg-gold-200/60"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-2 text-[11px] ${t.id === tab ? "bg-white/20" : "bg-navy-900/5 text-navy-900/60"}`}>{data.counts[t.id]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Search */}
      <form className="relative mt-4" role="search">
        {tab !== "upcoming" && <input type="hidden" name="tab" value={tab} />}
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-700" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, email or booking code"
          className="w-full rounded-full border border-navy-900/15 bg-white py-3 pl-12 pr-28 text-navy-900 outline-none focus:border-royal-700 focus:ring-4 focus:ring-royal-700/10"
        />
        <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-royal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-900">Search</button>
      </form>

      {/* List */}
      <div className="mt-6 space-y-3">
        {data.items.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-navy-900/60 shadow-sm">
            {q ? `No bookings match “${q}”.` : tab === "today" ? "No appointments today." : "Nothing here yet."}
          </p>
        )}
        {data.items.map((b) => (
          <Link
            key={b.id}
            href={`/manage/b/${b.id}`}
            className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy-900/5 transition hover:shadow-lg hover:ring-royal-700/30 sm:p-5"
          >
            <div className="w-24 shrink-0 text-center sm:w-28">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-royal-700/70">
                {formatSalonDate(b.appointmentAt).split(",").slice(0, 2).join(",")}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-navy-900">{formatSalonTime(b.appointmentAt).replace(/ [A-Z]{3}$/, "")}</p>
            </div>
            <div className="min-w-0 flex-1 border-l border-navy-900/10 pl-4">
              <p className="truncate font-semibold text-navy-900">{b.clientName}</p>
              <p className="truncate text-sm text-navy-900/60">
                {b.service.name} · {b.clientPhone}
              </p>
              <div className="mt-2">
                <StatusBadges b={b} />
              </div>
            </div>
            <ArrowRightIcon className="shrink-0 text-navy-900/30 transition group-hover:translate-x-1 group-hover:text-royal-700" />
          </Link>
        ))}
      </div>

      {data.pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href({ tab, q, page: page - 1 })} className="rounded-full bg-white px-4 py-2 font-semibold text-royal-700 ring-1 ring-navy-900/10">
              ← Prev
            </Link>
          )}
          <span className="text-navy-900/60">
            Page {page} of {data.pageCount}
          </span>
          {page < data.pageCount && (
            <Link href={href({ tab, q, page: page + 1 })} className="rounded-full bg-white px-4 py-2 font-semibold text-royal-700 ring-1 ring-navy-900/10">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
