'use client';

export function EventListSkeleton() {
  const card = (
    <div className="card animate-pulse p-5">
      <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-600" />
      <div className="mt-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-600" />
      <div className="mt-4 h-64 w-64 rounded-lg bg-slate-200 dark:bg-slate-600" />
      <div className="mt-3 h-3 w-28 rounded bg-slate-200 dark:bg-slate-600" />
    </div>
  );

  return (
    <div role="status" aria-label="Loading events">
      <div className="mb-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i}>{card}</div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>{card}</div>
        ))}
      </div>
    </div>
  );
}
