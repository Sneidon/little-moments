'use client';

import type { StaffRoleFilter } from '@/hooks/useStaffPage';

export interface StaffFiltersProps {
  roleFilter: StaffRoleFilter;
  onRoleFilterChange: (v: StaffRoleFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

export function StaffFilters({
  roleFilter,
  onRoleFilterChange,
  search,
  onSearchChange,
}: StaffFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value as StaffRoleFilter)}
        className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="all">All roles</option>
        <option value="principal">Principal</option>
        <option value="teacher">Teacher</option>
      </select>
      <input
        type="search"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm w-56 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
