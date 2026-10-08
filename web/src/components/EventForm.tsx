'use client';

import { EventDetailsSummary } from '@/components/EventDetailsSummary';
import { AttachmentFields, PostFormActions } from '@/components/post-form/AttachmentFields';
import { inputBase } from '@/components/post-form/styles';
import type { UseEventFormResult } from '@/hooks/useEventForm';
import type { ClassRoom } from 'shared/types';

const DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: 'All day (8 hours)' },
];

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

export interface EventFormProps {
  form: UseEventFormResult;
  classes: ClassRoom[];
  classNamesMap?: Record<string, string>;
}

export function EventForm({ form, classes, classNamesMap = {} }: EventFormProps) {
  const editing = !!form.editingId;
  return (
    <form onSubmit={form.submit} className="card mb-8 p-6">
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit event' : 'New event'}</h2>
      {editing && <EventDetailsSummary form={form} classNamesMap={classNamesMap} />}
      <input
        type="text"
        placeholder="Event title"
        value={form.title}
        onChange={(e) => form.setTitle(e.target.value)}
        className={`${inputBase} mb-3 w-full`}
      />
      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => form.setDescription(e.target.value)}
        rows={4}
        className={`${inputBase} mb-3 w-full resize-y`}
      />
      <AttachmentFields attachments={form} classes={classes} radioName="eventTarget" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Date & time</label>
          <input type="datetime-local" value={form.startAt} onChange={(e) => form.setStartAt(e.target.value)} className={`${inputBase} w-full`} />
        </div>
        <div>
          <label className={LABEL}>Duration</label>
          <select value={form.durationMinutes} onChange={(e) => form.setDurationMinutes(Number(e.target.value))} className={`${inputBase} w-full`}>
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <PostFormActions
        submitting={form.submitting}
        disabled={!form.canSubmit}
        label={editing ? 'Save changes' : 'Create event'}
        busyLabel={editing ? 'Saving…' : 'Creating…'}
        onCancel={form.closeForm}
      />
    </form>
  );
}
