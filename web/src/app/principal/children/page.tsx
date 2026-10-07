'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChildrenTable } from '@/components/children/ChildrenTable';
import { ExportMenu, FilterSkeleton, PageHero, SectionCard, TableSkeleton } from '@/components/ui';
import { useSchoolName } from '@/hooks/useSchoolName';
import { exportChildrenToCsv, exportChildrenToExcel } from '@/lib/export/children';
import { exportChildrenToPdf } from '@/lib/export/childrenPdf';
import { formatClassDisplay } from '@/lib/formatClass';
import { loadSchoolRoster } from '@/services/children';
import type { Child, ClassRoom } from 'shared/types';
import { filterChildren, type EnrollmentFilter } from './childForm';
import { ChildFormFields } from './components/ChildFormFields';
import { ChildrenFilters } from './components/ChildrenFilters';
import { PendingParentsSection } from './components/PendingParentsSection';
import { useChildEditor } from './useChildEditor';

export default function ChildrenPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const schoolName = useSchoolName(schoolId);
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [enrollment, setEnrollment] = useState<EnrollmentFilter>('active');
  const editor = useChildEditor({ schoolId, children, setChildren, editIdFromUrl: searchParams?.get('edit'), loading });

  useEffect(() => {
    if (!schoolId) return;
    loadSchoolRoster(schoolId).then((roster) => {
      setChildren(roster.children);
      setClasses(roster.classes);
      setLoading(false);
    });
  }, [schoolId]);

  const classDisplay = (id: string) => formatClassDisplay(classes.find((r) => r.id === id)) || id;
  const filtered = filterChildren(children, enrollment, classFilter, search);
  const hasFilter = !!classFilter || !!search.trim();

  const exportPdf = () => {
    setExportingPdf(true);
    try {
      exportChildrenToPdf(filtered, classDisplay, {
        onProgress: (msg) => {
          if (!msg) setExportingPdf(false);
        },
        schoolName: schoolName ?? undefined,
      });
    } catch (e) {
      console.error(e);
      setExportingPdf(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Children</span>}
        subtitle="Manage active enrollments — mark children as left school when they no longer attend"
        actions={
          <>
            <ExportMenu
              onCsv={() => exportChildrenToCsv(filtered, classDisplay)}
              onExcel={() => exportChildrenToExcel(filtered, classDisplay)}
              onPdf={exportPdf}
              busy={exportingPdf}
              disabled={loading || filtered.length === 0}
              title={filtered.length === 0 ? 'No children to export' : 'Export roster'}
            />
            <button type="button" onClick={editor.openNew} className="btn-primary">
              Add child
            </button>
          </>
        }
      />

      {editor.showForm && (
        <SectionCard topBar="primary" className="mb-8">
          <form onSubmit={editor.save}>
            <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">{editor.editingId ? 'Edit child' : 'New child'}</h2>
            <ChildFormFields form={editor.form} setForm={editor.setForm} classes={classes} />
            {!editor.editingId ? (
              <PendingParentsSection childName={editor.form.name} parents={editor.pendingParents} onChange={editor.setPendingParents} />
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={editor.submitting} className="btn-primary">
                {editor.submitting ? 'Saving…' : editor.editingId ? 'Save' : 'Add child'}
              </button>
              <button type="button" onClick={editor.close} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

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
          <ChildrenFilters
            classes={classes}
            enrollment={enrollment}
            classId={classFilter}
            search={search}
            onEnrollmentChange={setEnrollment}
            onClassChange={setClassFilter}
            onSearchChange={setSearch}
            onClear={() => {
              setClassFilter('');
              setSearch('');
              setEnrollment('active');
            }}
            shownCount={filtered.length}
            totalCount={children.length}
          />
          <SectionCard topBar="accent" padding="none">
            <ChildrenTable childList={filtered} classDisplay={classDisplay} hrefFor={(c) => `/principal/children/${c.id}`} showStatus showGender />
            {filtered.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-slate-500 dark:text-slate-400">{hasFilter ? 'No children match the current filters.' : 'No children yet.'}</p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                  {hasFilter ? 'Try another class, change the search, or clear filters.' : 'Add a child to get started.'}
                </p>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
