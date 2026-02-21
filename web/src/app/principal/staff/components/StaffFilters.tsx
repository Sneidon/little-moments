'use client';

import type { StaffRoleFilter } from '@/hooks/useStaffPage';

export interface StaffFiltersProps {
  roleFilter: StaffRoleFilter;
  onRoleFilterChange: (v: StaffRoleFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  filteredCount: number;
  totalCount: number;
}

export function StaffFilters({
  roleFilter,
  onRoleFilterChange,
  search,
  onSearchChange,
  filteredCount,
  totalCount,
}: StaffFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-sm">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by role</label>
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value as StaffRoleFilter)}
        className="input-base"
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
        className="input-base min-w-[180px]"
      />
      {(roleFilter !== 'all' || search.trim()) && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filteredCount} of {totalCount} staff
        </span>
      )}
    </div>
  );
}
