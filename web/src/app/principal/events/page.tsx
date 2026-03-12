'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { useEventForm } from '@/hooks/useEventForm';
import { useClasses } from '@/hooks/useClasses';
import { EventForm } from '@/components/EventForm';
import { EventsTable } from '@/components/EventsTable';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

export default function EventsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasHandledDateParam = useRef(false);
  const { upcoming, past, loading } = useEvents(schoolId);
  const { classes } = useClasses(schoolId);
  const form = useEventForm({
    schoolId,
    createdBy: profile?.uid ?? '',
  });

  const dateParam = searchParams.get('date');
  useEffect(() => {
    if (!dateParam || hasHandledDateParam.current) return;
    const parsed = new Date(dateParam);
    if (!isNaN(parsed.getTime())) {
      hasHandledDateParam.current = true;
      form.openFormForNew(parsed);
      router.replace('/principal/events', { scroll: false });
    }
  }, [dateParam, form.openFormForNew, router]);

  const classNamesMap = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes]
  );

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Events</span>}
        subtitle="Create and manage school events"
        actions={
          !form.showForm ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/principal/calendar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                View calendar
              </Link>
              <button type="button" onClick={form.openFormForNew} className="btn-primary shrink-0">
                Add event
              </button>
            </div>
          ) : undefined
        }
      />

      {form.showForm && <EventForm form={form} classes={classes} />}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton />
        </SectionCard>
      ) : (
        <>
          <EventsTable
            events={upcoming}
            variant="upcoming"
            classNamesMap={classNamesMap}
            onEdit={form.openFormForEdit}
          />
          <EventsTable
            events={past.slice(0, 20)}
            variant="past"
            classNamesMap={classNamesMap}
            onEdit={form.openFormForEdit}
          />
        </>
      )}
    </div>
  );
}
