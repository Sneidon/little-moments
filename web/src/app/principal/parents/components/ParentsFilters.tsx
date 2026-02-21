'use client';

import type { Child } from 'shared/types';

export interface ParentsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  childFilter: string;
  onChildFilterChange: (v: string) => void;
  children: Child[];
}

export function ParentsFilters({
  search,
  onSearchChange,
  childFilter,
  onChildFilterChange,
  children,
}: ParentsFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search by name, email or child…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm w-56 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <select
        value={childFilter}
        onChange={(e) => onChildFilterChange(e.target.value)}
        className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">All parents</option>
        {children.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
