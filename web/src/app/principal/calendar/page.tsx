'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { PageHero, SectionCard } from '@/components/ui';
import type { Event } from 'shared/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default function PrincipalCalendarPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { events, loading } = useEvents(schoolId);
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const byDate = useMemo(() => eventsByDate(events), [events]);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">School calendar</span>}
        subtitle="View events by month and open event details"
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-px rounded-lg bg-slate-200 dark:bg-slate-600">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[80px] bg-white dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
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
                const dayEvents = d ? byDate[key] ?? [] : [];
                const isToday =
                  d &&
                  d.getDate() === new Date().getDate() &&
                  d.getMonth() === new Date().getMonth() &&
                  d.getFullYear() === new Date().getFullYear();
                const addDateParam = d
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  : '';
                return (
                  <div
                    key={key}
                    className={`min-h-[90px] overflow-auto bg-white p-1.5 dark:bg-slate-800 ${
                      !d ? 'bg-slate-100/80 dark:bg-slate-900/50' : ''
                    } ${isToday ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                  >
                    {d ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/principal/events?date=${addDateParam}`)}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(`/principal/events?date=${addDateParam}`)}
                        className="block min-h-[80px] cursor-pointer rounded p-0.5 -m-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Click to add event on this day"
                      >
                        <span
                          className={`text-sm font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                          {d.getDate()}
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
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
                          {dayEvents.length > 3 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              +{dayEvents.length - 3} more
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
        )}
      </SectionCard>
    </div>
  );
}
