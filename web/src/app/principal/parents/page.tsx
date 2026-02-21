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
    <div className="animate-fade-in">
      <ParentsPageHeader
        onExportPdf={handleExportPdf}
        exportDisabled={exportingPdf || filteredParents.length === 0}
        exporting={exportingPdf}
      />

      {loading ? (
        <div className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      ) : (
        <>
          <ParentsFilters
            search={parentSearch}
            onSearchChange={setParentSearch}
            childFilter={parentChildFilter}
            onChildFilterChange={setParentChildFilter}
            children={children}
            filteredCount={filteredParents.length}
            totalCount={parents.length}
          />
          <ParentsTable parents={filteredParents} totalCount={parents.length} />
        </>
      )}
    </div>
  );
}
