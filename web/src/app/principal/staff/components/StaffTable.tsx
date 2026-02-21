'use client';

import type { UserProfile } from 'shared/types';

export interface StaffTableProps {
  staff: UserProfile[];
  totalCount: number;
  classForTeacher: (uid: string) => string | undefined;
  formatDate: (s: string | undefined) => string;
  onEditTeacher: (u: UserProfile) => void;
  onRequestPasswordReset?: (u: UserProfile) => void;
  passwordResetLoadingUid?: string | null;
}

export function StaffTable({
  staff,
  totalCount,
  classForTeacher,
  formatDate,
  onEditTeacher,
  onRequestPasswordReset,
  passwordResetLoadingUid,
}: StaffTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preferred name</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Assigned class</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Added</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Updated</th>
              <th className="w-0 px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.displayName ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.preferredName ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === 'principal'
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3">
                {u.role === 'teacher' ? (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {u.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{classForTeacher(u.uid) ?? '—'}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(u.updatedAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex flex-nowrap items-center justify-end gap-2">
                  {u.role === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => onEditTeacher(u)}
                      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                  )}
                  {(u.role === 'teacher' || u.role === 'principal') && u.email && onRequestPasswordReset && (
                    <button
                      type="button"
                      onClick={() => onRequestPasswordReset(u)}
                      disabled={passwordResetLoadingUid === u.uid}
                      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      title="Send password reset email to this user"
                    >
                      {passwordResetLoadingUid === u.uid ? '…' : 'Reset'}
                    </button>
                  )}
                  {u.role === 'principal' && (!u.email || !onRequestPasswordReset) && (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {totalCount === 0 ? 'No staff yet.' : 'No staff match the current filters.'}
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {totalCount === 0 ? 'Add a teacher to get started.' : 'Try changing the filter or search.'}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
