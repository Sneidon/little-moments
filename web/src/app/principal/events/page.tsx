'use client';

import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { useEventForm } from '@/hooks/useEventForm';
import { EventCard } from '@/components/EventCard';
import { EventForm } from '@/components/EventForm';

export default function EventsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { upcoming, past } = useEvents(schoolId);
  const form = useEventForm({
    schoolId,
    createdBy: profile?.uid ?? '',
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Events
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create and manage school events
        </p>
      </div>

      <EventForm form={form} />

      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Upcoming events
      </h2>
      <div className="mb-8 space-y-4">
        {upcoming.map((ev) => (
          <EventCard key={ev.id} event={ev} variant="upcoming" />
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
          <EventCard key={ev.id} event={ev} variant="past" />
        ))}
        {past.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400">No past events.</p>
        )}
      </div>
    </div>
  );
}
