'use client';

import { useMemo } from 'react';
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
