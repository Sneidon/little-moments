import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Event } from 'shared/types';
import { dateKey, isToday, monthGrid, weekDays, weekStartOf } from './calendarUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GRID = 'grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-600 dark:bg-slate-600';
const rsvpHref = (ev: Event) => `/principal/events/${ev.id}/rsvps`;
const addHref = (d: Date) => `/principal/events?date=${dateKey(d)}`;

function WeekdayHeader() {
  return (
    <>
      {WEEKDAYS.map((wd) => (
        <div key={wd} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {wd}
        </div>
      ))}
    </>
  );
}

function EventChips({ events, max }: { events: Event[]; max: number }) {
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {events.slice(0, max).map((ev) => (
        <Link
          key={ev.id}
          href={rsvpHref(ev)}
          className="truncate rounded bg-primary-100 px-1.5 py-0.5 text-left text-xs font-medium text-primary-800 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:hover:bg-primary-800/50"
          title={ev.title}
          onClick={(e) => e.stopPropagation()}
        >
          {ev.title}
        </Link>
      ))}
      {events.length > max && <span className="text-xs text-slate-500 dark:text-slate-400">+{events.length - max} more</span>}
    </div>
  );
}

function ClickableDay({ date, className, title, children }: { date: Date; className: string; title: string; children: React.ReactNode }) {
  const router = useRouter();
  const go = () => router.push(addHref(date));
  return (
    <div role="button" tabIndex={0} onClick={go} onKeyDown={(e) => e.key === 'Enter' && go()} className={className} title={title}>
      {children}
    </div>
  );
}

function DayNumber({ date }: { date: Date }) {
  return (
    <span className={`text-sm font-medium ${isToday(date) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}>
      {date.getDate()}
    </span>
  );
}

export function DayView({ date, events }: { date: Date; events: Event[] }) {
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/80">
        <Link href={addHref(date)} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
          + Add event on this day
        </Link>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {sorted.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No events this day.</p>
        ) : (
          sorted.map((ev) => (
            <Link key={ev.id} href={rsvpHref(ev)} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="w-20 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
                {time(ev.startAt)}
                {ev.endAt && <> – {time(ev.endAt)}</>}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{ev.title}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function WeekView({ date, byDate }: { date: Date; byDate: Record<string, Event[]> }) {
  return (
    <div className={GRID}>
      <WeekdayHeader />
      {weekDays(weekStartOf(date)).map((d) => (
        <ClickableDay
          key={dateKey(d)}
          date={d}
          title="Click to add event"
          className={`min-h-[120px] cursor-pointer overflow-auto bg-white p-1.5 dark:bg-slate-800 ${
            isToday(d) ? 'ring-2 ring-primary-500 ring-inset' : ''
          } hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500`}
        >
          <DayNumber date={d} />
          <EventChips events={byDate[dateKey(d)] ?? []} max={4} />
        </ClickableDay>
      ))}
    </div>
  );
}

export function MonthView({ date, byDate }: { date: Date; byDate: Record<string, Event[]> }) {
  return (
    <div className={GRID}>
      <WeekdayHeader />
      {monthGrid(date.getFullYear(), date.getMonth()).map((d, i) => (
        <div
          key={d ? dateKey(d) : `empty-${i}`}
          className={`min-h-[90px] overflow-auto bg-white p-1.5 dark:bg-slate-800 ${!d ? 'bg-slate-100/80 dark:bg-slate-900/50' : ''} ${
            d && isToday(d) ? 'ring-2 ring-primary-500 ring-inset' : ''
          }`}
        >
          {d ? (
            <ClickableDay
              date={d}
              title="Click to add event on this day"
              className="block min-h-[80px] cursor-pointer rounded p-0.5 -m-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <DayNumber date={d} />
              <EventChips events={byDate[dateKey(d)] ?? []} max={3} />
            </ClickableDay>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function YearView({ year, events, onPickMonth }: { year: number; events: Event[]; onPickMonth: (month: number) => void }) {
  const counts = Array(12).fill(0);
  for (const ev of events) {
    const d = new Date(ev.startAt);
    if (d.getFullYear() === year) counts[d.getMonth()]++;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MONTH_NAMES.map((name, m) => (
        <button
          key={name}
          type="button"
          onClick={() => onPickMonth(m)}
          className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
        >
          <span className="font-semibold text-slate-800 dark:text-slate-100">{name}</span>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {counts[m]} {counts[m] === 1 ? 'event' : 'events'}
          </p>
        </button>
      ))}
    </div>
  );
}
