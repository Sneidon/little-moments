const dayButtonBase =
  'h-10 min-w-[5.5rem] flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors';
const dayButtonActive = 'border-primary-600 bg-primary-600 text-white shadow-sm';
const dayButtonInactive =
  'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700';

export interface ActivityFiltersProps {
  filterDay: string;
  setFilterDay: (day: string) => void;
  todayIso: string;
  yesterdayIso: string;
  daysWithActivity: string[];
}

export function ActivityFilters({
  filterDay,
  setFilterDay,
  todayIso,
  yesterdayIso,
  daysWithActivity,
}: ActivityFiltersProps) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Filter by date
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          className="input-base h-10 w-[10.5rem] min-w-0"
          aria-label="Select date"
        />
        <button
          type="button"
          onClick={() => setFilterDay(todayIso)}
          className={`${dayButtonBase} ${filterDay === todayIso ? dayButtonActive : dayButtonInactive}`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setFilterDay(yesterdayIso)}
          className={`${dayButtonBase} ${filterDay === yesterdayIso ? dayButtonActive : dayButtonInactive}`}
        >
          Yesterday
        </button>
        {daysWithActivity.map((d) => {
          const label =
            d === todayIso
              ? 'Today'
              : d === yesterdayIso
                ? 'Yesterday'
                : new Date(d).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
          const isSelected = filterDay === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setFilterDay(d)}
              className={`${dayButtonBase} ${isSelected ? dayButtonActive : dayButtonInactive}`}
            >
              {label}
            </button>
          );
        })}
        {daysWithActivity.length === 0 ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet</span>
        ) : null}
      </div>
    </div>
  );
}
