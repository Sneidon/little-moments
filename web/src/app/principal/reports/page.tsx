'use client';

import { useAuth } from '@/context/AuthContext';
import { useReportsPage } from '@/hooks/useReportsPage';
import {
  ReportsPageHeader,
  ReportsFilters,
  ReportsTable,
} from './components';

export default function ReportsPage() {
  const { profile } = useAuth();
  const {
    classes,
    filteredReports,
    loading,
    filters,
    setFilterClassId,
    setFilterDay,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterType,
    setChildSearch,
    setHasNotesOnly,
    setSortOrder,
    setLimit,
    classDisplay,
    limitOptions,
  } = useReportsPage(profile?.schoolId);

  const showClassColumn = !filters.classId;

  return (
    <div className="animate-fade-in">
      <ReportsPageHeader
        filteredReports={filteredReports}
        filters={filters}
        showClassColumn={showClassColumn}
        classDisplay={classDisplay}
      />
      <ReportsFilters
        classes={classes}
        filters={filters}
        limitOptions={limitOptions}
        onFilterClassId={setFilterClassId}
        onFilterDay={setFilterDay}
        onFilterDateFrom={setFilterDateFrom}
        onFilterDateTo={setFilterDateTo}
        onFilterType={setFilterType}
        onChildSearch={setChildSearch}
        onHasNotesOnly={setHasNotesOnly}
        onSortOrder={setSortOrder}
        onLimit={setLimit}
      />
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <ReportsTable
          rows={filteredReports}
          showClassColumn={showClassColumn}
          classDisplay={classDisplay}
        />
      )}
    </div>
  );
}
