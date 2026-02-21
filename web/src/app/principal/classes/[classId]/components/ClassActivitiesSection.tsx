import Link from 'next/link';
import { REPORT_TYPE_LABELS } from '@/constants/reports';
import type { ClassReportRow } from '@/hooks/useClassDetail';

export interface ClassActivitiesSectionProps {
  filterDay: string;
  setFilterDay: (day: string) => void;
  daysWithActivity: string[];
  reportsForDay: ClassReportRow[];
}

const dayButtonBase = 'rounded-lg px-3 py-1.5 text-sm';
const dayButtonActive = 'bg-primary-600 text-white';
const dayButtonInactive =
  'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600';

export function ClassActivitiesSection({
  filterDay,
  setFilterDay,
  daysWithActivity,
  reportsForDay,
}: ClassActivitiesSectionProps) {
  const dateLabel = new Date(filterDay + 'T12:00:00').toLocaleDateString(
    undefined,
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <section className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Class activities by day
      </h2>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            View day
          </label>
          <input
            type="date"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Jump to a day with activity
          </p>
          <div className="flex flex-wrap gap-2">
            {daysWithActivity.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFilterDay(d)}
                className={`${dayButtonBase} ${filterDay === d ? dayButtonActive : dayButtonInactive}`}
              >
                {new Date(d).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </button>
            ))}
            {daysWithActivity.length === 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                No activity recorded yet
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Activities on <strong>{dateLabel}</strong>
      </p>

      {reportsForDay.length === 0 ? (
        <p className="rounded-lg bg-slate-50 dark:bg-slate-700/50 py-8 text-center text-slate-500 dark:text-slate-400">
          No activities recorded for this class on this day.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  Child
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  Type
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  Time
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  Details
                </th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {reportsForDay.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 dark:border-slate-600"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/principal/children/${r.childId}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {r.childName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.timestamp
                      ? new Date(r.timestamp).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.mealOptionName ??
                      r.mealType ??
                      r.medicationName ??
                      r.incidentDetails ??
                      '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
