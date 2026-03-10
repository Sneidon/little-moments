'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReportsPage } from '@/hooks/useReportsPage';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import {
  ReportsPageHeader,
  ReportsFilters,
  ReportsTable,
} from '@/app/principal/reports/components';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SectionCard, TableSkeleton, FilterSkeleton } from '@/components/ui';

export default function AdminSchoolReportsPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, loading: schoolLoading, error: schoolError } = useAdminSchoolDetail(schoolId);
  const {
    classes,
    filteredReports,
    loading: reportsLoading,
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
  } = useReportsPage(schoolId);

  const showClassColumn = !filters.classId;
  const loading = schoolLoading || reportsLoading;

  if (schoolLoading && !school) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (schoolError || (!schoolLoading && !school)) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/schools"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">
            {schoolError ?? 'School not found.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/admin/schools/${schoolId}`}
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to {school?.name}
        </Link>
      </div>
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
