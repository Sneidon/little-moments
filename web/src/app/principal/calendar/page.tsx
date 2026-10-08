'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { PageHero, SectionCard } from '@/components/ui';
import { dateKey, groupByDate, shiftDate, viewTitle, type CalendarView } from './calendarUtils';
import { DayView, MonthView, WeekView, YearView } from './CalendarViews';

const VIEW_TABS: { id: CalendarView; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const NAV_BUTTON =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

export default function PrincipalCalendarPage() {
  const { profile } = useAuth();
  const { events, loading } = useEvents(profile?.schoolId);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('monthly');
  const byDate = useMemo(() => groupByDate(events), [events]);

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
            {VIEW_TABS.map(({ id, label }) => (
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
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{viewTitle(viewDate, view)}</h2>
            <button type="button" onClick={() => setViewDate((d) => shiftDate(d, view, -1))} className={NAV_BUTTON}>
              ←
            </button>
            <button type="button" onClick={() => setViewDate((d) => shiftDate(d, view, 1))} className={NAV_BUTTON}>
              →
            </button>
          </div>
        </div>
        {loading ? (
          <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : view === 'daily' ? (
          <DayView date={viewDate} events={byDate[dateKey(viewDate)] ?? []} />
        ) : view === 'weekly' ? (
          <WeekView date={viewDate} byDate={byDate} />
        ) : view === 'monthly' ? (
          <MonthView date={viewDate} byDate={byDate} />
        ) : (
          <YearView
            year={viewDate.getFullYear()}
            events={events}
            onPickMonth={(m) => {
              setViewDate(new Date(viewDate.getFullYear(), m));
              setView('monthly');
            }}
          />
        )}
      </SectionCard>
    </div>
  );
}
