import Link from 'next/link';
import type { Child } from 'shared/types';
import { ChildProfileCard } from './ChildProfileCard';

export interface ChildDetailHeaderProps {
  child: Child;
  ageText: string;
  classDisplay: string;
  reportsCount: number;
  lastReportTimestamp?: string;
  onExportPdf: () => void;
}

export function ChildDetailHeader({
  child,
  ageText,
  classDisplay,
  reportsCount,
  lastReportTimestamp,
  onExportPdf,
}: ChildDetailHeaderProps) {
  return (
    <>
      <div className="mb-6 flex items-center gap-4 border-b border-slate-200 dark:border-slate-600 pb-4">
        <Link
          href="/principal/children"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
          aria-label="Back to children list"
        >
          ← Back to children
        </Link>
      </div>

      <div className="card mb-8 p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {child.name}
              {child.preferredName && (
                <span className="ml-2 text-lg font-normal text-slate-600 dark:text-slate-300">
                  &quot;{child.preferredName}&quot;
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {reportsCount} {reportsCount === 1 ? 'activity' : 'activities'} total
              {lastReportTimestamp && (
                <>
                  {' '}
                  · Last activity{' '}
                  {new Date(lastReportTimestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={onExportPdf} className="btn-secondary">
              Export PDF
            </button>
            <Link href={`/principal/children?edit=${child.id}`} className="btn-secondary">
              Edit details
            </Link>
          </div>
        </div>
        <ChildProfileCard child={child} ageText={ageText} classDisplay={classDisplay} />
      </div>
    </>
  );
}
