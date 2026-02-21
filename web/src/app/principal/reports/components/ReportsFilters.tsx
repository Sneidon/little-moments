'use client';

import { REPORT_TYPE_OPTIONS } from '@/constants/reports';
import type { ClassRoom } from 'shared/types';
import type { ReportsFiltersState, ReportsSortOrder } from '@/hooks/useReportsPage';

interface ReportsFiltersProps {
  classes: ClassRoom[];
  filters: ReportsFiltersState;
  limitOptions: readonly number[];
  onFilterClassId: (v: string) => void;
  onFilterDay: (v: string) => void;
  onFilterDateFrom: (v: string) => void;
  onFilterDateTo: (v: string) => void;
  onFilterType: (v: string) => void;
  onChildSearch: (v: string) => void;
  onHasNotesOnly: (v: boolean) => void;
  onSortOrder: (v: ReportsSortOrder) => void;
  onLimit: (v: number) => void;
}

const inputClass =
  'rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400';

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </span>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export function ReportsFilters({
  classes,
  filters,
  limitOptions,
  onFilterClassId,
  onFilterDay,
  onFilterDateFrom,
  onFilterDateTo,
  onFilterType,
  onChildSearch,
  onHasNotesOnly,
  onSortOrder,
  onLimit,
}: ReportsFiltersProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSection title="Date & time">
          <div>
            <label className={labelClass}>Single day</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.day}
                onChange={(e) => onFilterDay(e.target.value)}
                className={inputClass}
                title="View activities for this day"
              />
              {filters.day && (
                <button
                  type="button"
                  onClick={() => onFilterDay('')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </FilterSection>

        <FilterSection title="Class & child">
          <div>
            <label className={labelClass}>Class</label>
            <select
              value={filters.classId}
              onChange={(e) => onFilterClassId(e.target.value)}
              className={inputClass}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className={labelClass}>Child name</label>
            <input
              type="text"
              value={filters.childSearch}
              onChange={(e) => onChildSearch(e.target.value)}
              placeholder="Search…"
              className={inputClass}
            />
          </div>
        </FilterSection>

        <FilterSection title="Type & options">
          <div>
            <label className={labelClass}>Report type</label>
            <select
              value={filters.type}
              onChange={(e) => onFilterType(e.target.value)}
              className={inputClass}
            >
              {REPORT_TYPE_OPTIONS.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasNotesOnly}
                onChange={(e) => onHasNotesOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">Has notes only</span>
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Display">
          <div>
            <label className={labelClass}>Sort</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => onSortOrder(e.target.value as ReportsSortOrder)}
              className={inputClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Max results</label>
            <select
              value={filters.limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              className={inputClass}
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? 'All' : n}
                </option>
              ))}
            </select>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
