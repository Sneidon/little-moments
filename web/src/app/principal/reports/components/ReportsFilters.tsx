'use client';

import { useState } from 'react';
import { REPORT_TYPE_OPTIONS } from '@/constants/reports';
import type { ClassRoom } from 'shared/types';
import type { ReportsFiltersState, ReportsSortOrder } from '@/hooks/useReportsPage';
import { SectionCard } from '@/components/ui';

interface ReportsFiltersProps {
  classes: ClassRoom[];
  filters: ReportsFiltersState;
  limitOptions: readonly number[];
  onClearFilters: () => void;
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
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 min-w-0';
const labelClass = 'mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400';

export function ReportsFilters({
  classes,
  filters,
  limitOptions,
  onClearFilters,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasAdvancedActive =
    filters.dateFrom ||
    filters.dateTo ||
    filters.type ||
    filters.hasNotesOnly ||
    filters.sortOrder !== 'newest' ||
    filters.limit !== 500;

  const hasActiveFilters =
    filters.day !== new Date().toISOString().slice(0, 10) ||
    filters.classId ||
    filters.childSearch.trim() ||
    hasAdvancedActive;

  return (
    <SectionCard topBar="accent" padding="default" className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Basic filters – always visible */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1 sm:max-w-[180px]">
          <label className={labelClass}>Day</label>
          <input
            type="date"
            value={filters.day}
            onChange={(e) => onFilterDay(e.target.value)}
            className={inputClass}
            title="View activities for this day"
          />
        </div>

        <div className="min-w-0 flex-1 sm:max-w-[200px]">
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

        <div className="min-w-0 flex-1 sm:max-w-[200px]">
          <label className={labelClass}>Child</label>
          <input
            type="text"
            value={filters.childSearch}
            onChange={(e) => onChildSearch(e.target.value)}
            placeholder="Search by name…"
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              showAdvanced || hasAdvancedActive
                ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700'
            }`}
            aria-expanded={showAdvanced}
          >
            <span>Advanced</span>
            {hasAdvancedActive && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-200 px-1.5 text-xs font-semibold text-primary-800 dark:bg-primary-700 dark:text-primary-100">
                •
              </span>
            )}
            <svg
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced filters – separate, collapsible */}
      {showAdvanced && (
        <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-600">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Advanced
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className={labelClass}>From date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterDateFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>To date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterDateTo(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0 flex flex-col justify-end">
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
            <div className="min-w-0">
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
            <div className="min-w-0">
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
          </div>
        </div>
      )}
    </SectionCard>
  );
}
