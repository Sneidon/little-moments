'use client';

export function AnnouncementListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading announcements">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse p-5">
          <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-600" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="mt-4 h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-600" />
          <div className="mt-3 h-3 w-24 rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      ))}
    </div>
  );
}
