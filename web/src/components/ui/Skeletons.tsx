'use client';

const pulse = 'animate-pulse rounded bg-slate-200 dark:bg-slate-600';

/** Filter/search bar placeholder: reserves space only (no skeleton). Use inside SectionCard. */
export function FilterSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div
      className={`min-h-[3.5rem] ${className}`}
      role="status"
      aria-label="Loading filters"
    />
  );
}

/** Table area placeholder. Use inside SectionCard or standalone. Optional rows/cols render a table-like grid. */
export function TableSkeleton({
  className = '',
  rows,
  cols,
}: { className?: string; rows?: number; cols?: number } = {}) {
  if (rows != null && cols != null && rows > 0 && cols > 0) {
    return (
      <div className={`overflow-hidden ${className}`} role="status" aria-label="Loading">
        <table className="data-table w-full">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className={`h-4 w-16 ${pulse}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: cols }, (_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div className={`h-4 ${pulse}`} style={{ width: colIdx === cols - 1 ? '4rem' : '80%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
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

/** School settings placeholder: single block, same card size and border radius. */
export function SchoolSettingsSkeleton({ className = '' }: { className?: string } = {}) {
  return (
    <div
      className={`card max-w-xl min-h-[18rem] rounded-card animate-pulse bg-slate-200 dark:bg-slate-600 ${className}`}
      role="status"
      aria-label="Loading school settings"
    />
  );
}
