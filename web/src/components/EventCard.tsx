'use client';

import type { Event, EventDocumentLink } from 'shared/types';

/** Event image: square aspect, no stretch. */
const EVENT_IMAGE_CLASS = 'mt-2 aspect-square w-64 rounded-lg object-cover';

export interface EventCardProps {
  event: Event;
  variant?: 'upcoming' | 'past';
}

function LinkList({
  items,
  showTitle,
  title,
}: {
  items: EventDocumentLink[];
  showTitle?: boolean;
  title?: string;
}) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {showTitle && title && (
        <li className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </li>
      )}
      {items.map((d, i) => (
        <li key={i}>
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            {d.label || d.name || d.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EventCard({ event, variant = 'upcoming' }: EventCardProps) {
  const ev = event;
  const hasDocuments = ev.documents && ev.documents.length > 0;
  const hasLinks = ev.links && ev.links.length > 0;

  const isPast = variant === 'past';
  const cardClass = isPast
    ? 'rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4'
    : 'card p-5';

  return (
    <article className={cardClass}>
      <h3
        className={
          isPast
            ? 'font-medium text-slate-700 dark:text-slate-200'
            : 'font-semibold text-slate-800 dark:text-slate-100'
        }
      >
        {ev.title}
      </h3>
      {ev.description && (
        <p
          className={
            isPast
              ? 'mt-1 text-sm text-slate-600 dark:text-slate-300'
              : 'mt-2 text-slate-600 dark:text-slate-300'
          }
        >
          {ev.description}
        </p>
      )}
      {ev.imageUrl && (
        <img src={ev.imageUrl} alt="" className={EVENT_IMAGE_CLASS} />
      )}
      {hasDocuments && (
        <LinkList items={ev.documents!} showTitle={hasLinks} title="Documents" />
      )}
      {hasLinks && (
        <LinkList items={ev.links!} showTitle={hasDocuments} title="Links" />
      )}
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {new Date(ev.startAt).toLocaleString()}
      </p>
    </article>
  );
}
