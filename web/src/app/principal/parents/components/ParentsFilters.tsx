'use client';

import type { Child } from 'shared/types';
import { SectionCard } from '@/components/ui';

export interface ParentsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  childFilter: string;
  onChildFilterChange: (v: string) => void;
  children: Child[];
  filteredCount: number;
  totalCount: number;
}

export function ParentsFilters({
  search,
  onSearchChange,
  childFilter,
  onChildFilterChange,
  children,
  filteredCount,
  totalCount,
}: ParentsFiltersProps) {
  const hasActiveFilters = childFilter.length > 0 || search.trim().length > 0;

  const handleClear = () => {
    onChildFilterChange('');
    onSearchChange('');
  };

  return (
    <SectionCard topBar="warm" padding="default" className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by child</label>
        <select
          value={childFilter}
          onChange={(e) => onChildFilterChange(e.target.value)}
          className="input-base max-w-[220px]"
        >
          <option value="">All parents</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search by name, email or child…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-base min-w-[180px] max-w-[280px]"
        />
        {(childFilter || search.trim()) && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredCount} of {totalCount} parents
          </span>
        )}
      </div>
    </SectionCard>
  );
}
