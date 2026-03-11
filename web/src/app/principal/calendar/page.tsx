'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { PageHero, SectionCard } from '@/components/ui';
import type { Event } from 'shared/types';

type CalendarView = 'daily' | 'weekly' | 'monthly' | 'yearly';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const total = startPad + daysInMonth;
  const rows = Math.ceil(total / 7) * 7;
  const out: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
  while (out.length < rows) out.push(null);
  return out;
}

function eventKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eventsByDate(events: Event[]): Record<string, Event[]> {
  const byDate: Record<string, Event[]> = {};
  for (const ev of events) {
    const d = new Date(ev.startAt);
    const key = eventKey(d);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }
  return byDate;
}

/** Week start = Sunday. Returns the Sunday of the week containing d. */
function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDays(weekStart: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

function isToday(d: Date): boolean {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export default function PrincipalCalendarPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { events, loading } = useEvents(schoolId);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('monthly');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const byDate = useMemo(() => eventsByDate(events), [events]);

  const weekStart = useMemo(() => getWeekStart(viewDate), [viewDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel =
    view === 'weekly'
      ? `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';

  const dayEvents = useMemo(() => {
    const key = eventKey(viewDate);
    return (byDate[key] ?? []).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [byDate, viewDate]);

  const prev = () => {
    if (view === 'daily') setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
    else if (view === 'weekly') setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
    else if (view === 'monthly') setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
    else setViewDate((d) => new Date(d.getFullYear() - 1, d.getMonth()));
  };

  const next = () => {
    if (view === 'daily') setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    else if (view === 'weekly') setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
    else if (view === 'monthly') setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
    else setViewDate((d) => new Date(d.getFullYear() + 1, d.getMonth()));
  };

  const titleByView =
    view === 'daily'
      ? viewDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : view === 'weekly'
        ? weekLabel
        : view === 'monthly'
          ? monthLabel
          : String(year);

  const addDateParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const goToMonth = (y: number, m: number) => {
    setViewDate(new Date(y, m));
    setView('monthly');
  };

  const viewTabs: { id: CalendarView; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">School calendar</span>}
        subtitle="View events by day, week, month, or year"
        actions={
          <Link
            href="/principal/events"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Manage events
          </Link>
        }
      />

      <SectionCard topBar="accent" className="overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {viewTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  view === id
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{titleByView}</h2>
            <button
              type="button"
              onClick={prev}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : view === 'daily' ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/80">
              <Link
                href={`/principal/events?date=${addDateParam(viewDate)}`}
                className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                + Add event on this day
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {dayEvents.length === 0 ? (
                <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No events this day.</p>
              ) : (
                dayEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/principal/events/${ev.id}/rsvps`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="w-20 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {new Date(ev.startAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      {ev.endAt && (
                        <> – {new Date(ev.endAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}</>
                      )}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{ev.title}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        ) : view === 'weekly' ? (
          <div className="grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-600 dark:bg-slate-600">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {wd}
              </div>
            ))}
            {weekDays.map((d) => {
              const key = eventKey(d);
              const dayEventsInWeek = byDate[key] ?? [];
              const addParam = addDateParam(d);
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/principal/events?date=${addParam}`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/principal/events?date=${addParam}`)}
                  className={`min-h-[120px] cursor-pointer overflow-auto bg-white p-1.5 dark:bg-slate-800 ${
                    isToday(d) ? 'ring-2 ring-primary-500 ring-inset' : ''
                  } hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  title="Click to add event"
                >
                  <span
                    className={`text-sm font-medium ${isToday(d) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {d.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEventsInWeek.slice(0, 4).map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/principal/events/${ev.id}/rsvps`}
                        className="truncate rounded bg-primary-100 px-1.5 py-0.5 text-left text-xs font-medium text-primary-800 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:hover:bg-primary-800/50"
                        title={ev.title}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ev.title}
                      </Link>
                    ))}
                    {dayEventsInWeek.length > 4 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        +{dayEventsInWeek.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === 'monthly' ? (
          <>
            <div className="grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-600 dark:bg-slate-600">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {wd}
                </div>
              ))}
              {days.map((d, i) => {
                const key = d ? eventKey(d) : `empty-${i}`;
                const dayEventsInMonth = d ? byDate[key] ?? [] : [];
                const addDate = d ? addDateParam(d) : '';
                return (
                  <div
                    key={key}
                    className={`min-h-[90px] overflow-auto bg-white p-1.5 dark:bg-slate-800 ${
                      !d ? 'bg-slate-100/80 dark:bg-slate-900/50' : ''
                    } ${d && isToday(d) ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                  >
                    {d ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/principal/events?date=${addDate}`)}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(`/principal/events?date=${addDate}`)}
                        className="block min-h-[80px] cursor-pointer rounded p-0.5 -m-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Click to add event on this day"
                      >
                        <span
                          className={`text-sm font-medium ${isToday(d) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                          {d.getDate()}
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {dayEventsInMonth.slice(0, 3).map((ev) => (
                            <Link
                              key={ev.id}
                              href={`/principal/events/${ev.id}/rsvps`}
                              className="truncate rounded bg-primary-100 px-1.5 py-0.5 text-left text-xs font-medium text-primary-800 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:hover:bg-primary-800/50"
                              title={ev.title}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ev.title}
                            </Link>
                          ))}
                          {dayEventsInMonth.length > 3 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              +{dayEventsInMonth.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }, (_, m) => {
              const monthStart = new Date(year, m, 1).getTime();
              const monthEndExcl = new Date(year, m + 1, 1).getTime();
              let count = 0;
              for (const ev of events) {
                const t = new Date(ev.startAt).getTime();
                if (t >= monthStart && t < monthEndExcl) count++;
              }
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => goToMonth(year, m)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{MONTH_NAMES[m]}</span>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {count} {count === 1 ? 'event' : 'events'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
