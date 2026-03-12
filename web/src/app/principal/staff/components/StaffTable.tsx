'use client';

import type { UserProfile } from 'shared/types';
import { SectionCard } from '@/components/ui';

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
    <SectionCard topBar="accent" padding="none">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Preferred name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned class</th>
              <th>Added</th>
              <th>Updated</th>
              <th className="w-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.uid}>
              <td className="cell-main">{u.displayName ?? '—'}</td>
              <td>{u.preferredName ?? '—'}</td>
              <td>{u.email}</td>
              <td>
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
              <td>
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
              <td>{classForTeacher(u.uid) ?? '—'}</td>
              <td className="cell-muted">{formatDate(u.createdAt)}</td>
              <td className="cell-muted">{formatDate(u.updatedAt)}</td>
              <td className="whitespace-nowrap text-right">
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
    </SectionCard>
  );
}
