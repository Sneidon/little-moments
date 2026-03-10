'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { useEventForm } from '@/hooks/useEventForm';
import { useClasses } from '@/hooks/useClasses';
import { EventCard } from '@/components/EventCard';
import { EventForm } from '@/components/EventForm';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

export default function EventsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { upcoming, past, loading } = useEvents(schoolId);
  const { classes } = useClasses(schoolId);
  const form = useEventForm({
    schoolId,
    createdBy: profile?.uid ?? '',
  });

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
            <button type="button" onClick={form.openFormForNew} className="btn-primary shrink-0">
              Add event
            </button>
          ) : undefined
        }
      />

      {form.showForm && <EventForm form={form} classes={classes} />}

      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Upcoming events
      </h2>
      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton />
        </SectionCard>
      ) : (
        <>
          <div className="mb-8 space-y-4">
            {upcoming.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                variant="upcoming"
                classNamesMap={classNamesMap}
                onEdit={() => form.openFormForEdit(ev)}
              />
            ))}
            {upcoming.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">No upcoming events.</p>
            )}
          </div>

          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Past events
          </h2>
          <div className="space-y-4">
            {past.slice(0, 20).map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                variant="past"
                classNamesMap={classNamesMap}
                onEdit={() => form.openFormForEdit(ev)}
              />
            ))}
            {past.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">No past events.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
