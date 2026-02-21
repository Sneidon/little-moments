'use client';

import type { Announcement, EventDocumentLink } from 'shared/types';

export interface AnnouncementCardProps {
  announcement: Announcement;
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

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const a = announcement;
  const hasDocuments = a.documents && a.documents.length > 0;
  const hasLinks = a.links && a.links.length > 0;

  return (
    <article className="card p-5">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
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
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        {new Date(a.createdAt).toLocaleString()}
      </p>
    </article>
  );
}
