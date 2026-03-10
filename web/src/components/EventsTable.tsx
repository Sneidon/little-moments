'use client';

import Link from 'next/link';
import type { Event } from 'shared/types';
import { SectionCard } from '@/components/ui';

export interface EventsTableProps {
  events: Event[];
  variant: 'upcoming' | 'past';
  classNamesMap?: Record<string, string>;
  onEdit: (event: Event) => void;
}

export function EventsTable({
  events,
  variant,
  classNamesMap = {},
  onEdit,
}: EventsTableProps) {
  function audience(ev: Event): string {
    if (ev.targetType === 'everyone' || !ev.targetType) return 'Everyone';
    if (ev.targetClassIds?.length) {
      const names = ev.targetClassIds.map((id) => classNamesMap[id] || id);
      return names.length ? names.join(', ') : '—';
    }
    return '—';
  }

  const title = variant === 'upcoming' ? 'Upcoming events' : 'Past events';

  return (
    <SectionCard topBar="accent" padding="none" className={variant === 'past' ? 'mt-8' : ''}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{events.length} {events.length === 1 ? 'event' : 'events'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead className="bg-slate-50/80 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Title</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Date & time</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Audience</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preview</th>
              <th className="w-0 px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{ev.title}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {new Date(ev.startAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{audience(ev)}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={ev.description || undefined}>
                  {ev.description ? ev.description.replace(/\s+/g, ' ').trim().slice(0, 60) + (ev.description.length > 60 ? '…' : '') : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {variant === 'upcoming' && (
                      <Link
                        href={`/principal/events/${ev.id}/rsvps`}
                        className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        RSVPs{ev.parentResponses && Object.keys(ev.parentResponses).length > 0 ? ` (${Object.keys(ev.parentResponses).length})` : ''}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(ev)}
                      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {events.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {variant === 'upcoming' ? 'No upcoming events.' : 'No past events.'}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
