'use client';

import Link from 'next/link';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import { formatClassDisplay } from '@/lib/formatClass';

export interface LinkedChildrenListProps {
  children: Child[];
  classes: ClassRoom[];
}

export function LinkedChildrenList({ children, classes }: LinkedChildrenListProps) {
  const classDisplay = (classId: string | null | undefined) =>
    classId ? formatClassDisplay(classes.find((c) => c.id === classId)) ?? '—' : '—';

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/50 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Linked children</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Children linked to this parent. Manage from each child&apos;s profile.
        </p>
      </div>
      {children.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">No children linked yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Invite this parent from a child&apos;s profile page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preferred name</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Date of birth</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Class</th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/principal/children/${c.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.preferredName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{classDisplay(c.classId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
