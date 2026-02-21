'use client';

import Link from 'next/link';
import type { ParentWithChildren } from '@/lib/exportStaffPagePdf';
import type { UserProfile } from 'shared/types';

export interface ParentsTableProps {
  parents: ParentWithChildren[];
  totalCount: number;
  onRequestPasswordReset?: (user: UserProfile) => void;
  passwordResetLoadingUid?: string | null;
}

export function ParentsTable({
  parents,
  totalCount,
  onRequestPasswordReset,
  passwordResetLoadingUid,
}: ParentsTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Phone</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Linked children</th>
              <th className="w-0 px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p.uid} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                <Link
                  href={`/principal/parents/${p.uid}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {p.displayName ?? '—'}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.email ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.phone ?? '—'}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {p.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3">
                {p.children?.length ? (
                  <span className="flex flex-wrap gap-x-1 gap-y-0.5">
                    {p.children.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && ', '}
                        <Link
                          href={`/principal/children/${c.id}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {p.email && onRequestPasswordReset ? (
                  <button
                    type="button"
                    onClick={() => onRequestPasswordReset(p)}
                    disabled={passwordResetLoadingUid === p.uid}
                    className="btn-secondary inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title="Send password reset email to this parent"
                  >
                    {passwordResetLoadingUid === p.uid ? '…' : 'Reset'}
                  </button>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {parents.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {totalCount === 0 ? 'No parents yet.' : 'No parents match the current filters.'}
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {totalCount === 0 ? 'Invite parents from a child\'s profile to get started.' : 'Try changing the filter or search.'}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
