'use client';

import type { UserProfile } from 'shared/types';

export interface ParentProfileCardProps {
  parent: UserProfile;
}

function formatDate(s: string | undefined) {
  return s ? new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
}

export function ParentProfileCard({ parent }: ParentProfileCardProps) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Contact details</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
          <a
            href={`mailto:${parent.email ?? ''}`}
            className="text-slate-800 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 break-all"
          >
            {parent.email ?? '—'}
          </a>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
          <p className="text-slate-800 dark:text-slate-200">
            {parent.phone ? (
              <a href={`tel:${parent.phone}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                {parent.phone}
              </a>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
          <p className="text-slate-800 dark:text-slate-200">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                parent.isActive !== false
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
              }`}
            >
              {parent.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Account updated</p>
          <p className="text-slate-800 dark:text-slate-200">{formatDate(parent.updatedAt)}</p>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Account created</p>
        <p className="text-slate-700 dark:text-slate-300">{formatDate(parent.createdAt)}</p>
      </div>
    </div>
  );
}
