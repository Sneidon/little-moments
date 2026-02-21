'use client';

import type { UserProfile } from 'shared/types';

export interface StaffTableProps {
  staff: UserProfile[];
  totalCount: number;
  classForTeacher: (uid: string) => string | undefined;
  formatDate: (s: string | undefined) => string;
  onEditTeacher: (u: UserProfile) => void;
}

export function StaffTable({
  staff,
  totalCount,
  classForTeacher,
  formatDate,
  onEditTeacher,
}: StaffTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Preferred name</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Role</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Status</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Assigned class</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Added</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Updated</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((u) => (
            <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
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
              <td className="px-4 py-3">
                {u.role === 'teacher' && (
                  <button
                    type="button"
                    onClick={() => onEditTeacher(u)}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && (
        <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
          {totalCount === 0
            ? 'No staff in this school yet. Use Add teacher to add teachers.'
            : 'No staff match the current filters.'}
        </p>
      )}
    </div>
  );
}
