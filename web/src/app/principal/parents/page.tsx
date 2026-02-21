'use client';

import { useParentsPage } from '@/hooks/useParentsPage';
import { ParentsPageHeader, ParentsFilters, ParentsTable } from './components';

export default function ParentsPage() {
  const {
    loading,
    filteredParents,
    parents,
    children,
    parentSearch,
    setParentSearch,
    parentChildFilter,
    setParentChildFilter,
    exportingPdf,
    handleExportPdf,
  } = useParentsPage();

  return (
    <div>
      <ParentsPageHeader
        onExportPdf={handleExportPdf}
        exportDisabled={exportingPdf || filteredParents.length === 0}
        exporting={exportingPdf}
      />
      <p className="mb-8 text-slate-600 dark:text-slate-300">
        Parents linked to children at your school. Invite and manage parents from each child&apos;s profile page.
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <>
          <ParentsFilters
            search={parentSearch}
            onSearchChange={setParentSearch}
            childFilter={parentChildFilter}
            onChildFilterChange={setParentChildFilter}
            children={children}
          />
          <ParentsTable parents={filteredParents} totalCount={parents.length} />
        </>
      )}
    </div>
  );
}
