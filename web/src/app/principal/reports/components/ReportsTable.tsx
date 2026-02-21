'use client';

import { REPORT_TYPE_LABELS, REPORT_TYPE_STYLES } from '@/constants/reports';
import type { ReportRow } from '@/hooks/useReportsPage';

interface ReportsTableProps {
  rows: ReportRow[];
  showClassColumn: boolean;
  classDisplay: (id: string) => string;
}

export function ReportsTable({ rows, showClassColumn, classDisplay }: ReportsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {rows.length === 0
            ? 'No reports'
            : `${rows.length} ${rows.length === 1 ? 'report' : 'reports'}`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Child</th>
              {showClassColumn && (
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Class</th>
              )}
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Type</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Time</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Details</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-t border-slate-100 dark:border-slate-600/80 ${
                  i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                } hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition-colors`}
              >
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {r.childName}
                </td>
                {showClassColumn && (
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.childClassId ? classDisplay(r.childClassId) : '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      REPORT_TYPE_STYLES[r.type ?? ''] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                  {r.timestamp
                    ? new Date(r.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? undefined}>
                  {r.mealOptionName ??
                    r.mealType ??
                    r.medicationName ??
                    r.incidentDetails ??
                    '—'}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={r.notes ?? undefined}>
                  {r.notes ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-3 rounded-full bg-slate-100 dark:bg-slate-700 p-4">
            <svg className="h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No reports match the filters</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try changing the date range, class, or type</p>
        </div>
      )}
    </div>
  );
}
