import Link from 'next/link';
import type { UseEventFormResult } from '@/hooks/useEventForm';

const btnGhost =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
const LINK = 'text-primary-600 hover:underline dark:text-primary-400';
const DT = 'font-medium text-slate-600 dark:text-slate-300';

function scheduleSummary(startAt: string, durationMinutes: number): string {
  const start = startAt ? new Date(startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return '—';
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return `${start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} – ${end.toLocaleTimeString(undefined, { timeStyle: 'short' })}`;
}

function audienceSummary(form: UseEventFormResult, classNames: Record<string, string>): string {
  if (form.targetType === 'everyone') return 'Everyone';
  return form.targetClassIds.length ? form.targetClassIds.map((id) => classNames[id] || id).join(', ') : '—';
}

function AttachmentList({ form }: { form: UseEventFormResult }) {
  return (
    <ul className="list-inside list-disc space-y-1 text-slate-800 dark:text-slate-200">
      {form.documents.map((d, i) => {
        const label = d.label?.trim() || `Document ${i + 1}`;
        if (d.existingUrl) {
          return (
            <li key={`d-${i}-e`}>
              <a href={d.existingUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                {label}
              </a>
              <span className="text-slate-400"> (file)</span>
            </li>
          );
        }
        return d.file ? (
          <li key={`d-${i}-n`}>
            {label}
            <span className="text-slate-400"> — new upload: {d.file.name}</span>
          </li>
        ) : null;
      })}
      {form.links.map((l, i) =>
        l.url.trim() ? (
          <li key={`l-${i}`}>
            <a href={l.url.trim()} target="_blank" rel="noopener noreferrer" className={LINK}>
              {l.label?.trim() || l.url.trim()}
            </a>
            <span className="text-slate-400"> (link)</span>
          </li>
        ) : null
      )}
    </ul>
  );
}

export function EventDetailsSummary({ form, classNamesMap }: { form: UseEventFormResult; classNamesMap: Record<string, string> }) {
  const hasAttachments = form.existingImageUrl || form.documents.some((d) => d.existingUrl || d.file) || form.links.some((l) => l.url.trim());
  return (
    <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-600 dark:bg-slate-800/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Event details</p>
      <dl className="grid gap-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className={DT}>When</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{scheduleSummary(form.startAt, form.durationMinutes)}</dd>
          </div>
          <div>
            <dt className={DT}>Audience</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{audienceSummary(form, classNamesMap)}</dd>
          </div>
        </div>
        <div>
          <dt className={DT}>Description</dt>
          <dd className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-900 dark:text-slate-100">
            {form.description.trim() ? form.description : <span className="text-slate-400">No description</span>}
          </dd>
        </div>
        {hasAttachments && (
          <div>
            <dt className={DT}>Attachments & links</dt>
            <dd className="mt-1 space-y-2">
              {form.existingImageUrl && !form.imageFile && !form.videoFile && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Event {form.existingMediaType === 'video' ? 'video' : 'image'} below (replace using the media fields).
                </p>
              )}
              <AttachmentList form={form} />
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-600">
        <Link href={`/principal/events/${form.editingId}/rsvps`} className={btnGhost}>
          View RSVP responses
        </Link>
      </div>
    </div>
  );
}
