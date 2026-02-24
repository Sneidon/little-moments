'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { formatClassDisplay, ageFromDob } from '@/lib/formatClass';
import { getReportsForDay, getDaysWithActivity, getActivitySummaryText } from '@/lib/reports';
import { exportChildDetailsToPdf } from '@/lib/exportChildDetailsPdf';
import { exportChildDetailsToCsv } from '@/lib/exportChildDetailsCsv';
import { exportChildDetailsToExcel } from '@/lib/exportChildDetailsExcel';
import { useChildDetail } from '@/hooks/useChildDetail';
import { useChildParents } from '@/hooks/useChildParents';
import { ExportPdfOptionsDialog } from '@/components/ExportPdfOptionsDialog';
import {
  ChildDetailHeader,
  ParentsSection,
  ActivityList,
} from '@/app/principal/children/[childId]/components';

const CHILD_EXPORT_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'parents', label: 'Parents' },
  { id: 'activitySummary', label: 'Activity summary' },
] as const;

export default function AdminSchoolChildDetailPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const childId = typeof params?.childId === 'string' ? params.childId : undefined;
  const { child, classes, reports, loading } = useChildDetail(schoolId, childId, {
    redirectPathIfNotFound: schoolId ? `/admin/schools/${schoolId}/children` : '/admin/schools',
  });
  const { parents } = useChildParents(child);
  const [filterDay, setFilterDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportPdfOpen, setExportPdfOpen] = useState(false);

  const classDisplay = useCallback(
    (id: string | null | undefined) =>
      id ? formatClassDisplay(classes.find((c) => c.id === id)) || id : '—',
    [classes]
  );

  const reportsForDay = getReportsForDay(reports, filterDay);
  const daysWithActivity = getDaysWithActivity(reports);
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const activitySummaryText = getActivitySummaryText(reportsForDay);

  const handleExportPdfWithOptions = useCallback(
    (selectedIds: string[]) => {
      if (!child) return;
      const set = new Set(selectedIds);
      exportChildDetailsToPdf({
        child,
        classes,
        parents,
        reports,
        classDisplay,
        include: {
          profile: set.has('profile'),
          parents: set.has('parents'),
          activitySummary: set.has('activitySummary'),
        },
      });
    },
    [child, classes, parents, reports, classDisplay]
  );

  const handleExportCsv = useCallback(() => {
    if (!child) return;
    exportChildDetailsToCsv({ child, classes, parents, reports, classDisplay });
  }, [child, classes, parents, reports, classDisplay]);

  const handleExportExcel = useCallback(() => {
    if (!child) return;
    exportChildDetailsToExcel({ child, classes, parents, reports, classDisplay });
  }, [child, classes, parents, reports, classDisplay]);

  if (loading || !child) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ExportPdfOptionsDialog
        open={exportPdfOpen}
        onClose={() => setExportPdfOpen(false)}
        title="Export child details to PDF"
        sections={CHILD_EXPORT_SECTIONS}
        onExport={handleExportPdfWithOptions}
      />
      <ChildDetailHeader
        child={child}
        ageText={ageFromDob(child.dateOfBirth)}
        classDisplay={classDisplay(child.classId)}
        reportsCount={reports.length}
        lastReportTimestamp={reports[0]?.timestamp}
        onExportPdf={() => setExportPdfOpen(true)}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        backHref={schoolId ? `/admin/schools/${schoolId}/children` : '/admin/schools'}
        backLabel="Back to children"
        showEditLink={false}
      />
      <ParentsSection
        childName={child.name}
        maxParents={4}
        parents={parents}
        readOnly
      />
      <ActivityList
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        todayIso={todayIso}
        yesterdayIso={yesterdayIso}
        daysWithActivity={daysWithActivity}
        reportsForDay={reportsForDay}
        activitySummaryText={activitySummaryText}
      />
    </div>
  );
}
