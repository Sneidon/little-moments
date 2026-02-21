import type { DailyReport } from 'shared/types';
import { ReportListItem } from './ReportListItem';
import { ActivityFilters } from './ActivityFilters';

export interface ActivityListProps {
  filterDay: string;
  setFilterDay: (day: string) => void;
  todayIso: string;
  yesterdayIso: string;
  daysWithActivity: string[];
  reportsForDay: DailyReport[];
  activitySummaryText: string;
}

export function ActivityList({
  filterDay,
  setFilterDay,
  todayIso,
  yesterdayIso,
  daysWithActivity,
  reportsForDay,
  activitySummaryText,
}: ActivityListProps) {
  const dateLabel = new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <section className="card p-6">
      <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Day-to-day activities
      </h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        View and filter by date. Jump to recent days that have recorded activity.
      </p>

      <ActivityFilters
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        todayIso={todayIso}
        yesterdayIso={yesterdayIso}
        daysWithActivity={daysWithActivity}
      />

      <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Activities on <strong className="text-slate-800 dark:text-slate-100">{dateLabel}</strong>
          {reportsForDay.length > 0 ? (
            <span className="ml-2 text-slate-500 dark:text-slate-400">
              · {reportsForDay.length} {reportsForDay.length === 1 ? 'activity' : 'activities'} (
              {activitySummaryText})
            </span>
          ) : null}
        </p>
      </div>

      {reportsForDay.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No activities recorded for this day.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Activities are added by teachers from the app.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reportsForDay.map((r) => (
            <ReportListItem key={r.id} report={r} />
          ))}
        </ul>
      )}
    </section>
  );
}