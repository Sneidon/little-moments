'use client';

const pulse = 'animate-pulse rounded bg-slate-200 dark:bg-slate-600';

/** Filter/search bar placeholder: single block. Use inside SectionCard. */
export function FilterSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div
      className={`min-h-[3.5rem] ${pulse} ${className}`}
      role="status"
      aria-label="Loading filters"
    />
  );
}

/** Table area placeholder: single block. Use inside SectionCard or standalone. */
export function TableSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div
      className={`min-h-[12rem] ${pulse} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Single card placeholder (e.g. list item, content block). */
export function CardSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div className={`rounded-card border border-slate-200 dark:border-slate-600 p-5 ${className}`} role="status" aria-label="Loading">
      <div className={`h-5 w-2/3 ${pulse}`} />
      <div className={`mt-3 h-3 w-full ${pulse}`} />
      <div className={`mt-2 h-3 w-4/5 ${pulse}`} />
    </div>
  );
}

/** Dashboard stat card placeholder. */
export function StatCardSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div className={`rounded-card border border-slate-200 dark:border-slate-600 p-5 ${pulse} h-[180px] ${className}`} role="status" aria-label="Loading" />
  );
}
