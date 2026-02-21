'use client';

import type { Announcement, EventDocumentLink } from 'shared/types';

export interface AnnouncementCardProps {
  announcement: Announcement;
  /** Optional map of class id -> name for target audience display */
  classNamesMap?: Record<string, string>;
  onEdit?: () => void;
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

export function AnnouncementCard({ announcement, classNamesMap, onEdit }: AnnouncementCardProps) {
  const a = announcement;
  const hasDocuments = a.documents && a.documents.length > 0;
  const hasLinks = a.links && a.links.length > 0;

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
        <div className="flex items-center gap-2">
          {(a.targetType === 'everyone' || !a.targetType) && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-600 dark:text-slate-400">
              Everyone
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {a.targetType === 'classes' && (
        <TargetBadge
          targetType={a.targetType}
          targetClassIds={a.targetClassIds}
          classNamesMap={classNamesMap}
        />
      )}
      {a.body ? (
        <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{a.body}</p>
      ) : null}
      {a.imageUrl && (
        <img
          src={a.imageUrl}
          alt=""
          className="mt-2 max-h-64 w-full rounded-lg object-cover"
        />
      )}
      {hasDocuments && (
        <LinkList items={a.documents!} showTitle={hasLinks} title="Documents" />
      )}
      {hasLinks && (
        <LinkList items={a.links!} showTitle={hasDocuments} title="Links" />
      )}
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500" aria-label="Posted date">
        {new Date(a.createdAt).toLocaleString()}
      </p>
    </article>
  );
}
