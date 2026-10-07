'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportChildrenToPdf } from '@/lib/export/childrenPdf';
import { exportChildrenToCsv, exportChildrenToExcel } from '@/lib/export/children';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ChildrenTable } from '@/components/children/ChildrenTable';
import { ExportMenu, PageHero, SectionCard } from '@/components/ui';

export default function AdminSchoolChildrenPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, classes, children, loading, error } = useAdminSchoolDetail(schoolId);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const classDisplay = (id: string) => formatClassDisplay(classes.find((r) => r.id === id)) || id;
  const filteredChildren = filterClassId
    ? children.filter((c) => c.classId === filterClassId)
    : children;

  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      exportChildrenToPdf(filteredChildren, classDisplay, {
        onProgress: (msg) => {
          if (!msg) setExportingPdf(false);
        },
        schoolName: school?.name,
      });
    } catch (e) {
      console.error(e);
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error || !school) {
    return (
      <div className="animate-fade-in">
        <Link href="/admin/schools" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error ?? 'School not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        backHref={`/admin/schools/${schoolId}`}
        backLabel={school.name}
        title={<span className="text-gradient-warm">Children</span>}
        subtitle={`Enrolled children at ${school.name}`}
        actions={
          <ExportMenu
            className="relative shrink-0"
            onCsv={() => exportChildrenToCsv(filteredChildren, classDisplay)}
            onExcel={() => exportChildrenToExcel(filteredChildren, classDisplay)}
            onPdf={handleExportPdf}
            busy={exportingPdf}
            disabled={filteredChildren.length === 0}
          />
        }
      />

      <SectionCard topBar="accent" padding="default" className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
          {filterClassId && (
            <button
              type="button"
              onClick={() => setFilterClassId('')}
              className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by class</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="input-base max-w-[220px]"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{formatClassDisplay(c)}</option>
            ))}
          </select>
          {filterClassId && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {filteredChildren.length} of {children.length} children
            </span>
          )}
        </div>
      </SectionCard>

      <div className="card overflow-hidden">
        <ChildrenTable
          childList={filteredChildren}
          classDisplay={classDisplay}
          hrefFor={(c) => `/admin/schools/${schoolId}/children/${c.id}`}
        />
        {filteredChildren.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {filterClassId ? 'No children in this class.' : 'No children yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
