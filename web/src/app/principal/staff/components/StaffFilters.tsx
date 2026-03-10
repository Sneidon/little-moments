'use client';

import type { StaffRoleFilter } from '@/hooks/useStaffPage';
import { SectionCard } from '@/components/ui';

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
  const hasActiveFilters = roleFilter !== 'all' || search.trim().length > 0;

  const handleClear = () => {
    onRoleFilterChange('all');
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
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by role</label>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as StaffRoleFilter)}
          className="input-base max-w-[200px]"
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
          className="input-base min-w-[180px] max-w-[280px]"
        />
        {(roleFilter !== 'all' || search.trim()) && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredCount} of {totalCount} staff
          </span>
        )}
      </div>
    </SectionCard>
  );
}
