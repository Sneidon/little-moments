'use client';

import type { Child } from 'shared/types';

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
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-sm">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by child</label>
      <select
        value={childFilter}
        onChange={(e) => onChildFilterChange(e.target.value)}
        className="input-base"
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
        className="input-base min-w-[180px]"
      />
      {(childFilter || search.trim()) && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filteredCount} of {totalCount} parents
        </span>
      )}
    </div>
  );
}
