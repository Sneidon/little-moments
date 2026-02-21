'use client';

import Link from 'next/link';
import type { UserProfile } from 'shared/types';

export interface ParentDetailHeaderProps {
  parent: UserProfile;
  childrenCount: number;
}

export function ParentDetailHeader({ parent, childrenCount }: ParentDetailHeaderProps) {
  return (
    <>
      <div className="mb-6 flex items-center gap-4 border-b border-slate-200 dark:border-slate-600 pb-4">
        <Link
          href="/principal/parents"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
          aria-label="Back to parents list"
        >
          ← Back to parents
        </Link>
      </div>

      <div className="card mb-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {parent.displayName ?? '—'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {childrenCount} linked {childrenCount === 1 ? 'child' : 'children'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
