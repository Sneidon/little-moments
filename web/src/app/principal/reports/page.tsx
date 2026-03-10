'use client';

import { useAuth } from '@/context/AuthContext';
import { useReportsPage } from '@/hooks/useReportsPage';
import {
  ReportsPageHeader,
  ReportsFilters,
  ReportsTable,
} from './components';
import { SectionCard, TableSkeleton, FilterSkeleton } from '@/components/ui';

export default function ReportsPage() {
  const { profile } = useAuth();
  const {
    classes,
    filteredReports,
    loading,
    filters,
    clearFilters,
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
      {loading ? (
        <>
          <SectionCard topBar="accent" padding="default" className="mb-6">
            <FilterSkeleton />
          </SectionCard>
          <SectionCard topBar="accent" padding="none">
            <TableSkeleton />
          </SectionCard>
        </>
      ) : (
        <>
      <ReportsFilters
        classes={classes}
        filters={filters}
        limitOptions={limitOptions}
        onClearFilters={clearFilters}
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
        <ReportsTable
          rows={filteredReports}
          showClassColumn={showClassColumn}
          classDisplay={classDisplay}
        />
        </>
      )}
    </div>
  );
}
