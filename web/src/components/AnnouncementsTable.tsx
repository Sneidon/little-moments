'use client';

import type { Announcement } from 'shared/types';
import { SectionCard } from '@/components/ui';

export interface AnnouncementsTableProps {
  announcements: Announcement[];
  classNamesMap?: Record<string, string>;
  onEdit: (announcement: Announcement) => void;
}

export function AnnouncementsTable({
  announcements,
  classNamesMap = {},
  onEdit,
}: AnnouncementsTableProps) {
  function audience(a: Announcement): string {
    if (a.targetType === 'everyone' || !a.targetType) return 'Everyone';
    if (a.targetClassIds?.length) {
      const names = a.targetClassIds.map((id) => classNamesMap[id] || id);
      return names.length ? names.join(', ') : '—';
    }
    return '—';
  }

  return (
    <SectionCard topBar="accent" padding="none">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead className="bg-slate-50/80 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Title</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Audience</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preview</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Posted</th>
              <th className="w-0 px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.title}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{audience(a)}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={a.body || undefined}>
                  {a.body ? a.body.replace(/\s+/g, ' ').trim().slice(0, 80) + (a.body.length > 80 ? '…' : '') : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(a)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {announcements.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No announcements yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Click &quot;Add announcement&quot; to get started.</p>
        </div>
      )}
    </SectionCard>
  );
}
