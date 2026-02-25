'use client';

import Link from 'next/link';
import type { Event, EventDocumentLink } from 'shared/types';

/** Event image: square aspect, no stretch. */
const EVENT_IMAGE_CLASS = 'mt-2 aspect-square w-64 rounded-lg object-cover';

export interface EventCardProps {
  event: Event;
  variant?: 'upcoming' | 'past';
  /** Optional map of class id -> name for target audience display */
  classNamesMap?: Record<string, string>;
  onEdit?: () => void;
}

function TargetBadge({
  targetType,
  targetClassIds,
  classNamesMap,
}: {
  targetType?: 'everyone' | 'classes';
  targetClassIds?: string[];
  classNamesMap?: Record<string, string>;
}) {
  if (!targetType || targetType === 'everyone') return null;
  if (!targetClassIds?.length) return null;
  const names = classNamesMap
    ? targetClassIds.map((id) => classNamesMap[id] || id).filter(Boolean)
    : [];
  if (names.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
      For: {names.join(', ')}
    </p>
  );
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

export function EventCard({ event, variant = 'upcoming', classNamesMap, onEdit }: EventCardProps) {
  const ev = event;
  const hasDocuments = ev.documents && ev.documents.length > 0;
  const hasLinks = ev.links && ev.links.length > 0;

  const isPast = variant === 'past';
  const cardClass = isPast
    ? 'rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4'
    : 'card p-5';

  return (
    <article className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          className={
            isPast
              ? 'font-medium text-slate-700 dark:text-slate-200'
              : 'font-semibold text-slate-800 dark:text-slate-100'
          }
        >
          {ev.title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {(ev.targetType === 'everyone' || !ev.targetType) && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-600 dark:text-slate-400">
              Everyone
            </span>
          )}
          {onEdit && (
            <>
              <Link
                href={`/principal/events/${ev.id}/rsvps`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                View RSVPs
                {ev.parentResponses && Object.keys(ev.parentResponses).length > 0 && (
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    ({Object.keys(ev.parentResponses).length})
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={onEdit}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      {ev.targetType === 'classes' && (
        <TargetBadge
          targetType={ev.targetType}
          targetClassIds={ev.targetClassIds}
          classNamesMap={classNamesMap}
        />
      )}
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
